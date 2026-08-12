import type { BrowserWindow } from 'electron'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

/**
 * 获取本地日期字符串（YYYY-MM-DD），避免 toISOString 的 UTC 时区问题。
 * 与 src/utils/date.ts 中的 getLocalDateString 保持功能一致。
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 仅在 R-05 自动化环境中导出 renderer 证据，正常启动和发布包不会写入任何文件。
 */
export async function captureR05WindowEvidence(window: BrowserWindow, label: string): Promise<void> {
  const reportDir = process.env.R05_UI_REPORT_DIR
  if (!reportDir || window.isDestroyed()) return

  try {
    mkdirSync(reportDir, { recursive: true })
    await new Promise(resolve => setTimeout(resolve, 300))
    if (window.isDestroyed()) return
    const commandPath = join(reportDir, 'r05-command.json')
    if (existsSync(commandPath)) {
      const command = JSON.parse(readFileSync(commandPath, 'utf-8')) as {
        id?: string
        action?: string
        top?: number
        text?: string
        path?: string
      }
      if (command.action === 'scroll-settings' && Number.isFinite(command.top)) {
        await window.webContents.executeJavaScript(
          `document.querySelector('.settings-content')?.scrollTo(0, ${Number(command.top)})`,
          true
        )
      } else if (command.action === 'dispatch-shortcut') {
        await window.webContents.executeJavaScript(
          `window.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'F12',
            code: 'F12',
            ctrlKey: true,
            altKey: true,
            bubbles: true,
            cancelable: true
          }))`,
          true
        )
      } else if (command.action === 'click-first-shortcut') {
        await window.webContents.executeJavaScript(
          `document.querySelector('.shortcut-key-box')?.click()`,
          true
        )
      } else if (command.action === 'click-text' && command.text) {
        await window.webContents.executeJavaScript(
          `Array.from(document.querySelectorAll('button,.upload-area'))
            .find((element) => (element.textContent || '').includes(${JSON.stringify(command.text)}))
            ?.click()`,
          true
        )
      } else if (command.action === 'set-file-input' && command.path) {
        let debuggerAttachedByTest = false
        try {
          if (!window.webContents.debugger.isAttached()) {
            window.webContents.debugger.attach('1.3')
            debuggerAttachedByTest = true
          }
          const documentResult = await window.webContents.debugger.sendCommand(
            'DOM.getDocument',
            { depth: 0 }
          ) as { root?: { nodeId?: number } }
          const rootNodeId = documentResult.root?.nodeId
          if (!rootNodeId) {
            throw new Error('无法取得页面根节点')
          }
          const queryResult = await window.webContents.debugger.sendCommand(
            'DOM.querySelector',
            {
              nodeId: rootNodeId,
              selector: 'input[type="file"]'
            }
          ) as { nodeId?: number }
          if (!queryResult.nodeId) {
            throw new Error('页面中不存在文件输入控件')
          }
          await window.webContents.debugger.sendCommand(
            'DOM.setFileInputFiles',
            {
              nodeId: queryResult.nodeId,
              files: [command.path]
            }
          )
        } finally {
          if (debuggerAttachedByTest && window.webContents.debugger.isAttached()) {
            window.webContents.debugger.detach()
          }
        }
      } else if (command.action === 'open-storage-dialog') {
        await window.webContents.executeJavaScript(
          `window.__r05StorageResult = null;
          void window.electronAPI.selectStoragePath().then((result) => {
            window.__r05StorageResult = result
          }).catch((error) => {
            window.__r05StorageResult = {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }
          });
          'started'`,
          true
        )
      }
      writeFileSync(
        join(reportDir, 'r05-command-ack.json'),
        JSON.stringify({ id: command.id || '', action: command.action || '' }),
        'utf-8'
      )
      unlinkSync(commandPath)
    }
    const bodyText = await window.webContents.executeJavaScript(
      'document.body?.innerText || ""',
      true
    )
    writeFileSync(join(reportDir, `${label}-dom.txt`), String(bodyText), 'utf-8')
    const controlsJson = await window.webContents.executeJavaScript(
      `JSON.stringify({
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        testState: window.__r05StorageResult || null,
        controls: Array.from(document.querySelectorAll(
          'button,input,select,[title],.upload-area,.shortcut-key-box,.modal-overlay,.settings-content'
        )).map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            tag: element.tagName,
            title: element.getAttribute('title') || '',
            text: (element.textContent || '').trim(),
            placeholder: element.getAttribute('placeholder') || '',
            className: typeof element.className === 'string' ? element.className : '',
            type: element.getAttribute('type') || '',
            scrollTop: element.scrollTop || 0,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          }
        })
      })`,
      true
    )
    writeFileSync(join(reportDir, `${label}-controls.json`), String(controlsJson), 'utf-8')
    const image = await window.webContents.capturePage()
    writeFileSync(join(reportDir, `${label}-page.png`), image.toPNG())
  } catch (error) {
    writeFileSync(
      join(reportDir, `${label}-capture-error.txt`),
      error instanceof Error ? error.stack || error.message : String(error),
      'utf-8'
    )
  }
}

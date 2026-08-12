import { ref, type Ref } from 'vue'

interface ButtonPosition {
  right: number
  bottom: number
}

export function useTodayButtonDrag(
  todayBtnRef: Ref<HTMLElement | null>,
  btnPosition: Ref<ButtonPosition>,
  savePosition: () => Promise<void>
) {
  const isDragging = ref(false)
  const hasDragged = ref(false)
  const dragStartPos = ref({ x: 0, y: 0 })
  const dragThreshold = 3

  let handleMouseDown: ((event: MouseEvent) => void) | null = null
  let handleMouseMove: ((event: MouseEvent) => void) | null = null
  let handleMouseUp: (() => Promise<void>) | null = null

  function setupDragListeners() {
    if (!todayBtnRef.value) return

    handleMouseDown = (event: MouseEvent) => {
      isDragging.value = true
      hasDragged.value = false
      dragStartPos.value = { x: event.clientX, y: event.clientY }
      event.preventDefault()
    }

    handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.value || !todayBtnRef.value) return

      const deltaX = event.clientX - dragStartPos.value.x
      const deltaY = event.clientY - dragStartPos.value.y
      if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
        hasDragged.value = true
      }
      if (!hasDragged.value) return

      const container = todayBtnRef.value.parentElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const buttonRect = todayBtnRef.value.getBoundingClientRect()
      const newRight = containerRect.right - event.clientX - buttonRect.width / 2
      const newBottom = containerRect.bottom - event.clientY - buttonRect.height / 2
      btnPosition.value.right = Math.max(0, Math.min(newRight, containerRect.width - buttonRect.width))
      btnPosition.value.bottom = Math.max(0, Math.min(newBottom, containerRect.height - buttonRect.height))
    }

    handleMouseUp = async () => {
      if (isDragging.value && hasDragged.value) {
        await savePosition()
      }
      isDragging.value = false
      setTimeout(() => {
        hasDragged.value = false
      }, 100)
    }

    todayBtnRef.value.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function removeDragListeners() {
    if (todayBtnRef.value && handleMouseDown) {
      todayBtnRef.value.removeEventListener('mousedown', handleMouseDown)
    }
    if (handleMouseMove) {
      document.removeEventListener('mousemove', handleMouseMove)
    }
    if (handleMouseUp) {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }

  return { isDragging, hasDragged, setupDragListeners, removeDragListeners }
}

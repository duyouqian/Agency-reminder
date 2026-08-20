import { describe, it, expect } from 'vitest'
import { validateTodos, validateTags } from '../electron/data-store'

const validTodo = {
  id: '1',
  title: '测试任务',
  completed: false,
  color: '#1890ff',
  date: '2026-01-15',
  createdAt: '2026-01-15T10:00:00.000Z',
  tag: '需求',
  remindTime: '09:00',
  repeat: null,
  priority: 1,
  generatedFromId: 'parent-1',
  // repeatAnchorDay 故意不设置，因为 repeat 不是 monthly
}

describe('validateTodos', () => {
  it('通过最小合法字段', () => {
    const result = validateTodos({ todos: [{ ...validTodo, tag: undefined, remindTime: undefined, repeat: null, priority: 3, generatedFromId: undefined, repeatAnchorDay: undefined }] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('缺少 todos 数组抛错', () => {
    expect(() => validateTodos({})).toThrow('待办数据文件缺少 todos 数组')
  })

  it('todos 不是数组抛错', () => {
    expect(() => validateTodos({ todos: 'not-array' })).toThrow('待办数据文件缺少 todos 数组')
  })

  it('第 N 条不是对象抛错', () => {
    // 第一个元素是合法的，第二个不是对象，应该报第 2 条的错
    const validMinimal = { ...validTodo, tag: undefined, remindTime: undefined, repeat: null, priority: 3, generatedFromId: undefined }
    expect(() => validateTodos({ todos: [validMinimal, 'not-object'] })).toThrow('第 2 条待办必须是对象')
  })

  describe('id 校验', () => {
    it('id 缺失抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, id: '' }] })).toThrow('id 必须是非空字符串')
    })
    it('id 非字符串抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, id: 123 }] })).toThrow('id 必须是非空字符串')
    })
  })

  describe('title 校验', () => {
    it('title 缺失抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, title: '' }] })).toThrow('title 必须是非空字符串')
    })
    it('title 非字符串抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, title: 123 }] })).toThrow('title 必须是非空字符串')
    })
  })

  describe('completed 校验', () => {
    it('completed 非布尔抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, completed: 'yes' }] })).toThrow('completed 必须是布尔值')
    })
  })

  describe('color 校验', () => {
    it('color 缺失抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, color: '' }] })).toThrow('color 必须是非空字符串')
    })
  })

  describe('date 校验', () => {
    it('date 格式错误抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, date: '15-01-2026' }] })).toThrow('date 必须是有效的 YYYY-MM-DD 日期')
    })
    it('date 不存在抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, date: '2026-02-30' }] })).toThrow('date 必须是有效的 YYYY-MM-DD 日期')
    })
    it('date 非字符串抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, date: 123 }] })).toThrow('date 必须是有效的 YYYY-MM-DD 日期')
    })
  })

  describe('createdAt 校验', () => {
    it('createdAt 非字符串抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, createdAt: 123 }] })).toThrow('createdAt 必须是有效时间')
    })
    it('createdAt 无效时间抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, createdAt: 'not-a-date' }] })).toThrow('createdAt 必须是有效时间')
    })
  })

  describe('tag 校验', () => {
    it('tag 非字符串抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, tag: 123 }] })).toThrow('tag 必须是字符串')
    })
    it('tag 为 undefined 通过', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, tag: undefined }] })).not.toThrow()
    })
  })

  describe('remindTime 校验', () => {
    it('格式错误抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, remindTime: '9:00' }] })).toThrow('remindTime 必须是有效的 HH:mm 时间')
    })
    it('小时越界抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, remindTime: '25:00' }] })).toThrow('remindTime 必须是有效的 HH:mm 时间')
    })
    it('分钟越界抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, remindTime: '12:60' }] })).toThrow('remindTime 必须是有效的 HH:mm 时间')
    })
    it('undefined 通过', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, remindTime: undefined }] })).not.toThrow()
    })
  })

  describe('repeat 校验', () => {
    it('非法值抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeat: 'yearly' }] })).toThrow('repeat 必须是 daily、weekly、monthly 或 null')
    })
    it('daily/weekly/monthly/null 通过', () => {
      ;['daily', 'weekly', 'monthly', null].forEach(r => {
        expect(() => validateTodos({ todos: [{ ...validTodo, repeat: r }] })).not.toThrow()
      })
    })
  })

  describe('priority 校验', () => {
    it('非法值抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, priority: 4 }] })).toThrow('priority 必须是 1、2 或 3')
    })
    it('1/2/3 通过', () => {
      ;[1, 2, 3].forEach(p => {
        expect(() => validateTodos({ todos: [{ ...validTodo, priority: p }] })).not.toThrow()
      })
    })
  })

  describe('generatedFromId 校验', () => {
    it('空字符串抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, generatedFromId: '' }] })).toThrow('generatedFromId 必须是非空字符串')
    })
    it('undefined 通过', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, generatedFromId: undefined }] })).not.toThrow()
    })
  })

  describe('repeatAnchorDay 校验', () => {
    it('小于 1 抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeatAnchorDay: 0 }] })).toThrow('repeatAnchorDay 必须是 1 到 31 的整数')
    })
    it('大于 31 抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeatAnchorDay: 32 }] })).toThrow('repeatAnchorDay 必须是 1 到 31 的整数')
    })
    it('非整数抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeatAnchorDay: 15.5 }] })).toThrow('repeatAnchorDay 必须是 1 到 31 的整数')
    })
    it('undefined 通过', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeatAnchorDay: undefined }] })).not.toThrow()
    })
  })

  describe('repeatAnchorDay 与 repeat 关联约束', () => {
    it('repeat=monthly 时 repeatAnchorDay 通过', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeat: 'monthly', repeatAnchorDay: 31 }] })).not.toThrow()
    })
    it('repeat=daily 时 repeatAnchorDay 抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeat: 'daily', repeatAnchorDay: 15 }] })).toThrow('repeatAnchorDay 只允许用于 monthly 重复任务')
    })
    it('repeat=weekly 时 repeatAnchorDay 抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeat: 'weekly', repeatAnchorDay: 15 }] })).toThrow('repeatAnchorDay 只允许用于 monthly 重复任务')
    })
    it('repeat=null 时 repeatAnchorDay 抛错', () => {
      expect(() => validateTodos({ todos: [{ ...validTodo, repeat: null, repeatAnchorDay: 15 }] })).toThrow('repeatAnchorDay 只允许用于 monthly 重复任务')
    })
  })

  it('错误信息包含条目序号', () => {
    try {
      validateTodos({ todos: [validTodo, { ...validTodo, id: '' }] })
    } catch (e) {
      expect((e as Error).message).toContain('第 2 条')
    }
  })
})

describe('validateTags', () => {
  it('字符串数组通过', () => {
    expect(validateTags(['需求', 'Bug'])).toEqual(['需求', 'Bug'])
  })
  it('非数组抛错', () => {
    expect(() => validateTags('not-array')).toThrow('标签数据必须是字符串数组')
  })
  it('含非字符串元素抛错', () => {
    expect(() => validateTags(['需求', 123])).toThrow('标签数据必须是字符串数组')
  })
})
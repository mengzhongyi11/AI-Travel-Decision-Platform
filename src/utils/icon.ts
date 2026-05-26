const modules = import.meta.glob('/icons/*.png', {
  eager: true, // 立即加载，而非异步
  import: 'default', // 只导入默认导出
})

export const weatherIcons = Object.entries(modules).map(([path, module]) => {
  // 从路径提取文件名（不带扩展名）
  const name = path.match(/\/([^/]+)\.png$/)?.[1] || ''

  return {
    name, // 图标名称（如 "大雨"）
    path, // 完整路径
    src: module as string, // 图片 URL（Vite 处理后）
    url: module as string, // 别名，方便使用
  }
})

// 按名称查找
export const getWeatherIcon = (name: string) => {
  return weatherIcons.find((icon) => icon.name === name)
}

export function getWeatherIconUrl(name: string): string | undefined {
  console.log(weatherIcons)
  const time = new Date().getHours() < 18 ? '' : '夜间'
  switch (name) {
    case '晴':
      name = time + '晴天'
      break
    case '多云':
      name = time + '多云'
      break
    case '雾':
      name = time + '雾'
    case '阴':
      name = '阴天'
      break
  }
  console.log(name)
  const icon = getWeatherIcon(name)
  console.log(icon)
  return icon?.path
}

// 导出默认配置
export default weatherIcons

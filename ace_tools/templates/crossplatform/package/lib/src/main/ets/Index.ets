export function greet(name: string): string {
  return `Hello, ${name}! Welcome to module_name.`
}

export function calculateArea(width: number, height: number): number {
  return width * height
}

export function formatMessage(template: string, values: string[]): string {
  let result = template
  values.forEach((value, index) => {
    result = result.replace(`{${index}}`, value)
  })
  return result
}

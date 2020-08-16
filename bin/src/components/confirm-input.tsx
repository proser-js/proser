import React from 'react'
import TextInput from 'ink-text-input'
import yn from 'yn'

export const ConfirmInput = ({
  defaultYn = false,
  placeholder = 'No',
  onSubmit = () => {},
}: ConfirmInputProps) => {
  const [value, setValue] = React.useState<string>('')

  return (
    <TextInput
      placeholder={placeholder}
      value={value}
      onChange={setValue}
      onSubmit={(value) => {
        onSubmit(yn(value, {default: defaultYn}))
      }}
    />
  )
}

export interface ConfirmInputProps {
  /**
   * @default false
   */
  defaultYn?: boolean
  /**
   * @default n
   */
  placeholder?: string
  onSubmit?: (value: boolean) => any
}

/// <reference types="react" />
export declare const ConfirmInput: ({
  defaultYn,
  placeholder,
  onSubmit,
}: ConfirmInputProps) => JSX.Element
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

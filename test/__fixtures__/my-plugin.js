const React = require('react')
const {Box, Text} = require('ink')
const TextInput = require('ink-text-input').default

module.exports = (options, steps) => {
  return ({metadata, status, onSubmit}) => {
    const [value, setValue] = React.useState('')

    return status === 'active' || status === 'complete'
      ? React.createElement(Box, {}, [
          React.createElement(
            Box,
            {
              key: 0,
              marginRight: 1,
            },

            React.createElement(
              Text,
              {
                backgroundColor: status === 'active' ? '#4C51BF' : '#EBF4FF',
                color: status === 'active' ? '#EBF4FF' : '#3C366B',
              },
              ' Enter something '
            )
          ),
          status === 'active'
            ? React.createElement(TextInput, {
                key: 1,
                value,
                onChange: setValue,
                onSubmit: () => onSubmit({myMetadata: value}),
              })
            : React.createElement(Text, {key: 1}, value),
        ])
      : null
  }
}

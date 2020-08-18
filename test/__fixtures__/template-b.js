module.exports = function myTemplate({title, description}, argv) {
  return ```<Title text="${title}"/>

<Description>{${description}}</Description>
```
}

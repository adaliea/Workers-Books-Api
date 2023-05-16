Utilizes the Openlibrary APIs to serve my books websites

# Endpoints
## Currently Reading
https://books.api.dacubeking.com/currentlyreading

Example Response:
```html
I'm currently reading <a href="https://openlibrary.org/works/OL66554W">Pride and Prejudice</a> by <a href="https://openlibrary.org/authors/OL21594A">Jane Austen</a>
```

## Read
https://books.api.dacubeking.com/read

Example Response:
```json
[
  {
    "name": "The proposal",
    "link": "https://openlibrary.org/books/OL28110757M",
    "authors": [
      "Jasmine Guillory"
    ],
    "authorLinks": [
      "https://openlibrary.org/authors/OL7513322A"
    ],
    "published": 2018,
    "coverLink": "https://covers.openlibrary.org/b/id/9211495-M.jpg"
  },
  {
    "name": "The Heart Principle",
    "link": "https://openlibrary.org/books/OL31946909M",
    "authors": [
      "Helen Hoang"
    ],
    "authorLinks": [
      "https://openlibrary.org/authors/OL7536754A"
    ],
    "published": 2021,
    "coverLink": "https://covers.openlibrary.org/b/id/10249451-M.jpg"
  }
]

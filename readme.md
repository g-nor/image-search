# Image search

1. Searches for images using an api. For example, google image search.
1. Also, stores recent searches in a local db (sqlite). 

## To use
### Image search
`[yourdomain.com]/api/imagesearch/{search term}?offset={n}`

offset is optional

### Recent searches
`[yourdomain.com]/api/latest/imagesearch`

API key, database path, and other credentials are read from `env`

**Note**: Local db is reset when node restarts


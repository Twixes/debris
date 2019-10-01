# Debris API specification

Current version base API path is `/api/v1`. All endpoint paths below are its subpaths.  

All requests must be `Bearer` authorized with the `Authorization` header containing the `identify` scope Discord access token obtained through OAuth2 authorization flow and stored as a cookie. Alternatively, the access token may be passed as request paramater `accessToken`.


## Objects

### User

field               | type    | description
------------------- | ------- | --------------------------------------------------------------------
id                  | string  | the user's Discord ID
username            | string  | the user's current Discord username
discriminator       | string  | the user's current Discord discriminator
avatar              | ?string | the user's current Discord avatar ID
lightTheme          | boolean | whether the user has switched the theme to light instead of dark
filesListView       | boolean | whether the user has switched the files view to list instead of grid
firstLoginTimestamp | string  | the user's first Debris login timestamp in ISO format

##### Example
```JSON
{
  "id": "171599592708767744",
  "username": "Twixes",
  "discriminator": "2137",
  "avatar": "8bd66b4876edd74358874eec0e41d812",
  "lightTheme": true,
  "filesListView": false,
  "firstLoginTimestamp": "1970-01-01T00:00:00.000Z"
}
```

### File

field           | type     | description
--------------- | -------- | -----------------------------------------------------------
attachmentId    | string   | the Discord ID of the attachment the file was sent as
messageId       | string   | the Discord ID of the message the file was sent with
channelId       | string   | the Discord ID of the channel the file was sent in
guildId         | string   | the Discord ID of the guild the file was sent in
ownerId         | string   | the Discord ID of the user that uploaded the file
name            | string   | the file's name (no longer than 63 characters)
safeName        | string   | the file's original name as converted by Discord for safety
extension       | ?string  | the file's extension
mime            | ?string  | the file's MIME type
size            | integer  | the file's size in bytes (no larger than 8 000 000)
width           | ?integer | the image's width (if the file is an image)
height          | ?integer | the image's height (if the file is an image)
url             | string   | the file's URL
uploadTimestamp | string   | the file's upload timestamp in ISO format

##### Example
```JSON
{
  "attachmentId": "581610448412213269",
  "messageId": "578386320448159754",
  "channelId": "578386320448159754",
  "guildId": "578386320448159752",
  "ownerId": "171599592708767744",
  "name": "Richard Stallman.png",
  "safeName": "Richard_Stallman.png",
  "extension": "PNG",
  "mime": "image/png",
  "size": 524288,
  "width": 2048,
  "height": 2048,
  "url": "/files/581610448412213269/Richard%20STallman.png",
  "uploadTimestamp": "1970-01-01T00:00:00.000Z"
}
```

### Error

field   | type    | description
------- | ------- | ------------------------------
status  | integer | HTTP status code
code    | integer | error code from the list below
message | string  | error message

##### Example
```JSON
{
  "code": 401,
  "code": 40100,
  "message": "authorization data missing or invalid"
}
```


## Endpoints

### Get Current User
#### GET `/users/@me`

##### Request – `application/x-www-form-urlencoded`
No additional data.

##### Response – `application/json`
`200` and the current user object or `401`/`500` and an error object.

### Modify Current User
#### PATCH `/users/@me`

##### Request – `application/json`
field          | type    | description             | default
-------------- | ------- | ----------------------- | --------
?lightTheme    | boolean | new lightTheme value    | *absent*
?filesListView | boolean | new filesListView value | *absent*

##### Response – `application/json`
`200` and the current user object after modification or `400`/`401`/`500` and an error object.

### Get Current User Files Metadata
#### GET `/users/@me/files`

##### Request – `application/x-www-form-urlencoded`
field   | type    | description                                 | default
------- | ------- | ------------------------------------------- | --------
?limit  | integer | maximum number of files to retrieve         | *absent*
?before | string  | maximum file upload timestamp in ISO format | *absent*
?after  | string  | minimum file upload timestamp in ISO format | *absent*

##### Response – `application/json`
`200` and an array of the current user's file objects under `files` plus the total file count under `totalFileCount` plus the number of earlier files left under `earlierFilesLeft` or `400`/`401`/`500` and an error object.

### Save File
#### POST `/users/@me/files`

##### Request – `multipart/form-data`
field | type | description    | default
----- | ---- | -------------- | -----------
file  | file | file to upload | *mandatory*

##### Response – `application/json`
`201` and the saved file object or `400`/`401`/`413`/`500` and an error object.

### Get File Metadata
#### GET `/files/:attachmentId/:name`

##### Request – `application/x-www-form-urlencoded`
No additional data.

##### Response – `application/json`
`200` and the specified file object or `401`/`403`/`404`/`500` and an error object.

### Modify File Metadata
#### PATCH `/files/:attachmentId/:name`

##### Request – `application/json`
field    | type   | description                                   | default
-------- | ------ | --------------------------------------------- | --------
?name    | string | new name value (no longer than 63 characters) | *absent*

##### Response – `application/json`
`200` and the specified file object after modification or `400`/`401`/`403`/`404`/`500` and an error object.

### Delete File
#### DELETE `/files/:attachmentId/:name`

##### Request – `application/json`
No additional data.

##### Response – `application/json`
`204` and no data or `401`/`403`/`404`/`500` and an error object.


## Errors

code  | message
----- | ---------------------------------
40000 | mandatory field {fieldName} absent
40001 | field {fieldName} out of constraints ({constraints})
40100 | authorization data missing or invalid
40300 | user not permitted
40400 | endpoint not found
40401 | {resourceName} not found
40500 | method not allowed
41300 | payload too large (maximum {maximumSize}B)
50000 | internal error

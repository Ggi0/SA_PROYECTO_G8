


# 1 registrar 



## register

http://localhost:3000/auth/register

```
{
"email": "gBackAPi@gmail.com",
"password": "12345678",
"display_name": "Gio_API3"
}

```


response:
```
{
    "userId": "15ee1efb-0c4a-4667-b65a-afaf9019e812",
    "profileId": "25dff282-58fe-4634-a2fb-5d727d2cecab",
    "message": "Usuario registrado correctamente."
}

```


http://localhost:3000/auth/login

body
```json
{
"email": "gBackAPi@gmail.com",
"password": "12345678",
"device_info": "Postman / MacOS",
"ip_address": "127.0.0.1"
}
```


respuesta:
```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNWVlMWVmYi0wYzRhLTQ2NjctYjY1YS1hZmFmOTAxOWU4MTIiLCJlbWFpbCI6ImdCYWNrQVBpQGdtYWlsLmNvbSIsInJvbGUiOiJjbGllbnQiLCJ0b2tlblZlcnNpb24iOjEsImFjdGl2ZVByb2ZpbGVJZCI6bnVsbCwiaWF0IjoxNzgyNjA0MjE4LCJleHAiOjE3ODI2MDUxMTh9.fWiSUszv4JUm971_9-MfmYnB4oMXIob2vcLQ2Flj04E",
    "expiresIn": 900,
    "refreshToken": "afa612f13776cb53be186c630d472c3b3fb81f60b51317e44101ddcf5112e54d6b055a0b080acb306636fbb78037b3fe0ccc2441a8b2f8118457aae97c596b41",
    "user": {
        "userId": "15ee1efb-0c4a-4667-b65a-afaf9019e812",
        "email": "gBackAPi@gmail.com",
        "role": "client"
    },
    "profiles": [
        {}
    ]
}

```


GET http://localhost:3000/auth/profiles/

```
{
    "profiles": [
        {
            "profileId": "25dff282-58fe-4634-a2fb-5d727d2cecab",
            "displayName": "",
            "isKidsMode": false
        }
    ],
    "count": 1,
    "maxAllowed": 5
}
```

post http://localhost:3000/auth/profiles

body
```json
{
"user_id": "15ee1efb-0c4a-4667-b65a-afaf9019e812",
"display_name": "profile1",
"is_kids_mode": false,
"avatar_url": ""
}
```

respuesta:
```json
{
    "profile": {
        "profileId": "c8db7c1f-6704-4d32-b260-92726dd42f4f",
        "displayName": "profile1",
        "avatarUrl": "",
        "isKidsMode": false
    }
}
```

get http://localhost:3000/auth/profiles/

respuesta
```json
{
    "profiles": [
        {
            "profileId": "25dff282-58fe-4634-a2fb-5d727d2cecab",
            "displayName": "",
            "isKidsMode": false
        },
        {
            "profileId": "c8db7c1f-6704-4d32-b260-92726dd42f4f",
            "displayName": "profile1",
            "avatarUrl": "",
            "isKidsMode": false
        }
    ],
    "count": 2,
    "maxAllowed": 5
}
```


POST http://localhost:3000/auth/profiles/select
body
```json
{
"user_id": "15ee1efb-0c4a-4667-b65a-afaf9019e812",
"profile_id": "25dff282-58fe-4634-a2fb-5d727d2cecab"
}

```

Respuesta
```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNWVlMWVmYi0wYzRhLTQ2NjctYjY1YS1hZmFmOTAxOWU4MTIiLCJlbWFpbCI6ImdCYWNrQVBpQGdtYWlsLmNvbSIsInJvbGUiOiJjbGllbnQiLCJ0b2tlblZlcnNpb24iOjEsImFjdGl2ZVByb2ZpbGVJZCI6IjI1ZGZmMjgyLTU4ZmUtNDYzNC1hMmZiLTVkNzI3ZDJjZWNhYiIsImlhdCI6MTc4MjYwNTUyOCwiZXhwIjoxNzgyNjA2NDI4fQ._NWEOkPE-KtUYDbRctltGvK3yjMAqiOFPutUp_rKAVk",
    "activeProfile": {
        "profileId": "25dff282-58fe-4634-a2fb-5d727d2cecab",
        "displayName": "",
        "isKidsMode": false
    }
}
```

con otro perfil
PSOT http://localhost:3000/auth/profiles/select

body:
```json
{
"user_id": "15ee1efb-0c4a-4667-b65a-afaf9019e812",
"profile_id": "c8db7c1f-6704-4d32-b260-92726dd42f4f"
}
```

respuesta:
```json
{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNWVlMWVmYi0wYzRhLTQ2NjctYjY1YS1hZmFmOTAxOWU4MTIiLCJlbWFpbCI6ImdCYWNrQVBpQGdtYWlsLmNvbSIsInJvbGUiOiJjbGllbnQiLCJ0b2tlblZlcnNpb24iOjEsImFjdGl2ZVByb2ZpbGVJZCI6ImM4ZGI3YzFmLTY3MDQtNGQzMi1iMjYwLTkyNzI2ZGQ0MmY0ZiIsImlhdCI6MTc4MjYwNTYyNCwiZXhwIjoxNzgyNjA2NTI0fQ.adrhmHqQgUXy-qMWgq2gO5rLDZin5ipmlTf2nmGQY8Y",
    "activeProfile": {
        "profileId": "c8db7c1f-6704-4d32-b260-92726dd42f4f",
        "displayName": "profile1",
        "avatarUrl": "",
        "isKidsMode": false
    }
}
```
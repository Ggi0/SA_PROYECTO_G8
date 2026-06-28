

# tabla de datos de usuario
```bash
auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        | deactivated_at | deactivation_reason 
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+----------------+---------------------
 52c6e18f-91e4-4313-8750-0951a8684187 | admin@gmail.com | $2a$12$zsx0otN/joDXeRGioIj7huFj3Hk/wsF7F.YQmdxTPOMmnbjUc90fu |                |           | admin  | t         |             1 | 2026-06-28 07:39:18.254834+00 | 2026-06-28 07:39:18.254834+00 |                            |                | 
 4a7953ac-a9bd-45a7-b94b-62925058427e | gio@gmail.com   | $2a$12$GMXEoVGj4i1DG66N/EOI6et533Q3KUT15Zl54TOihT7M8Y/4MbaLS |                |           | client | t         |             1 | 2026-06-28 07:46:18.651799+00 | 2026-06-28 07:46:18.898503+00 |                            |                | 
 059602ae-e8c3-4b5d-ad70-17eb71c062a3 | gio2@gmail.com  | $2a$12$zsa3q4PK4KfTY4XvyjwJ3uPKoUZR3YOoYssGo1h4y58QKpNvJNft2 |                |           | client | t         |             1 | 2026-06-28 07:46:39.09843+00  | 2026-06-28 07:47:10.313527+00 | 2026-06-28 07:47:10.309+00 |                | 
(3 rows)

auth_db=# 

```


posterior a un tiempo

```bash
auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        | deactivated_at | deactivation_reason 
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+----------------+---------------------
 52c6e18f-91e4-4313-8750-0951a8684187 | admin@gmail.com | $2a$12$zsx0otN/joDXeRGioIj7huFj3Hk/wsF7F.YQmdxTPOMmnbjUc90fu |                |           | admin  | t         |             1 | 2026-06-28 07:39:18.254834+00 | 2026-06-28 07:39:18.254834+00 |                            |                | 
 4a7953ac-a9bd-45a7-b94b-62925058427e | gio@gmail.com   | $2a$12$GMXEoVGj4i1DG66N/EOI6et533Q3KUT15Zl54TOihT7M8Y/4MbaLS |                |           | client | t         |             1 | 2026-06-28 07:46:18.651799+00 | 2026-06-28 07:46:18.898503+00 |                            |                | 
 059602ae-e8c3-4b5d-ad70-17eb71c062a3 | gio2@gmail.com  | $2a$12$zsa3q4PK4KfTY4XvyjwJ3uPKoUZR3YOoYssGo1h4y58QKpNvJNft2 |                |           | client | t         |             1 | 2026-06-28 07:46:39.09843+00  | 2026-06-28 07:53:43.868552+00 | 2026-06-28 07:53:43.867+00 |                | 
(3 rows)

auth_db=# 
```



flujo:
auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        | deactivated_at | deactivation_reason 
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+----------------+---------------------
 0581a4b7-272c-4b87-95ff-566b7a8a79ee | admin@gmail.com | $2a$12$MLs194KJaFqSswN7KKCbZOixr0xhoKE5HOGPIwhmIU39Um3pkudZu |                |           | admin  | t         |             1 | 2026-06-28 08:33:50.234152+00 | 2026-06-28 08:33:50.234152+00 |                            |                | 
 5f8391ff-0880-49de-b2ca-1628e6dc988b | gio1c@gmail.com | $2a$12$xg8/g7dUv6SWwolvKgwA/.r5ZwSEafmgtW43NcgrfhLOJk8tyLtDG |                |           | client | t         |             1 | 2026-06-28 08:37:40.294964+00 | 2026-06-28 08:37:40.556125+00 |                            |                | 
 8f165168-d497-4e77-95fd-3281ab240ee3 | gio2c@gmail.com | $2a$12$Ck6XoUb4QXi0o5RXS3ybc.89Vlk2Gs0Ey4WPK09UmvlL1bL3RCdx. |                |           | client | t         |             1 | 2026-06-28 08:38:24.907509+00 | 2026-06-28 08:38:33.798543+00 | 2026-06-28 08:38:33.797+00 |                | 
 3225b92c-5136-4dc9-abb2-d301defe5f62 | gio3c@gmail.com | $2a$12$t/lu.ExSKbWp9QuGJfFH0O/AqlV0RkuZTZQ.fqhVtPvgFfU7xRTAO |                |           | client | t         |             1 | 2026-06-28 08:43:50.706304+00 | 2026-06-28 08:43:50.95175+00  |                            |                | 
(4 rows)

auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        | deactivated_at | deactivation_reason 
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+----------------+---------------------
 0581a4b7-272c-4b87-95ff-566b7a8a79ee | admin@gmail.com | $2a$12$MLs194KJaFqSswN7KKCbZOixr0xhoKE5HOGPIwhmIU39Um3pkudZu |                |           | admin  | t         |             1 | 2026-06-28 08:33:50.234152+00 | 2026-06-28 08:33:50.234152+00 |                            |                | 
 5f8391ff-0880-49de-b2ca-1628e6dc988b | gio1c@gmail.com | $2a$12$xg8/g7dUv6SWwolvKgwA/.r5ZwSEafmgtW43NcgrfhLOJk8tyLtDG |                |           | client | t         |             1 | 2026-06-28 08:37:40.294964+00 | 2026-06-28 08:37:40.556125+00 |                            |                | 
 8f165168-d497-4e77-95fd-3281ab240ee3 | gio2c@gmail.com | $2a$12$Ck6XoUb4QXi0o5RXS3ybc.89Vlk2Gs0Ey4WPK09UmvlL1bL3RCdx. |                |           | client | t         |             1 | 2026-06-28 08:38:24.907509+00 | 2026-06-28 08:38:33.798543+00 | 2026-06-28 08:38:33.797+00 |                | 
 3225b92c-5136-4dc9-abb2-d301defe5f62 | gio3c@gmail.com | $2a$12$t/lu.ExSKbWp9QuGJfFH0O/AqlV0RkuZTZQ.fqhVtPvgFfU7xRTAO |                |           | client | t         |             1 | 2026-06-28 08:43:50.706304+00 | 2026-06-28 08:44:29.918277+00 | 2026-06-28 08:44:29.916+00 |                | 


# primer desactivo:
"auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        |        deactivated_at         |  deactivation_reason   
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+-------------------------------+------------------------
 0581a4b7-272c-4b87-95ff-566b7a8a79ee | admin@gmail.com | $2a$12$MLs194KJaFqSswN7KKCbZOixr0xhoKE5HOGPIwhmIU39Um3pkudZu |                |           | admin  | t         |             1 | 2026-06-28 08:33:50.234152+00 | 2026-06-28 08:33:50.234152+00 |                            |                               | 
 8f165168-d497-4e77-95fd-3281ab240ee3 | gio2c@gmail.com | $2a$12$Ck6XoUb4QXi0o5RXS3ybc.89Vlk2Gs0Ey4WPK09UmvlL1bL3RCdx. |                |           | client | t         |             1 | 2026-06-28 08:38:24.907509+00 | 2026-06-28 08:38:33.798543+00 | 2026-06-28 08:38:33.797+00 |                               | 
 3225b92c-5136-4dc9-abb2-d301defe5f62 | gio3c@gmail.com | $2a$12$t/lu.ExSKbWp9QuGJfFH0O/AqlV0RkuZTZQ.fqhVtPvgFfU7xRTAO |                |           | client | t         |             1 | 2026-06-28 08:43:50.706304+00 | 2026-06-28 08:44:29.918277+00 | 2026-06-28 08:44:29.916+00 |                               | 
 5f8391ff-0880-49de-b2ca-1628e6dc988b | gio1c@gmail.com | $2a$12$xg8/g7dUv6SWwolvKgwA/.r5ZwSEafmgtW43NcgrfhLOJk8tyLtDG |                |           | client | f         |             1 | 2026-06-28 08:37:40.294964+00 | 2026-06-28 08:48:00.035397+00 |                            | 2026-06-28 08:48:00.035397+00 | inactividad_automatica
(4 rows)

"


# 2do desactivo:
"auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        |        deactivated_at         |  deactivation_reason   
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+-------------------------------+------------------------
 0581a4b7-272c-4b87-95ff-566b7a8a79ee | admin@gmail.com | $2a$12$MLs194KJaFqSswN7KKCbZOixr0xhoKE5HOGPIwhmIU39Um3pkudZu |                |           | admin  | t         |             1 | 2026-06-28 08:33:50.234152+00 | 2026-06-28 08:33:50.234152+00 |                            |                               | 
 3225b92c-5136-4dc9-abb2-d301defe5f62 | gio3c@gmail.com | $2a$12$t/lu.ExSKbWp9QuGJfFH0O/AqlV0RkuZTZQ.fqhVtPvgFfU7xRTAO |                |           | client | t         |             1 | 2026-06-28 08:43:50.706304+00 | 2026-06-28 08:44:29.918277+00 | 2026-06-28 08:44:29.916+00 |                               | 
 5f8391ff-0880-49de-b2ca-1628e6dc988b | gio1c@gmail.com | $2a$12$xg8/g7dUv6SWwolvKgwA/.r5ZwSEafmgtW43NcgrfhLOJk8tyLtDG |                |           | client | f         |             1 | 2026-06-28 08:37:40.294964+00 | 2026-06-28 08:48:00.035397+00 |                            | 2026-06-28 08:48:00.035397+00 | inactividad_automatica
 8f165168-d497-4e77-95fd-3281ab240ee3 | gio2c@gmail.com | $2a$12$Ck6XoUb4QXi0o5RXS3ybc.89Vlk2Gs0Ey4WPK09UmvlL1bL3RCdx. |                |           | client | f         |             1 | 2026-06-28 08:38:24.907509+00 | 2026-06-28 08:50:00.03826+00  | 2026-06-28 08:38:33.797+00 | 2026-06-28 08:50:00.03826+00  | inactividad_automatica
(4 rows)

"



# volvi a hacer login con el 3ro
auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        |        deactivated_at         |  deactivation_reason   
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+-------------------------------+------------------------
 0581a4b7-272c-4b87-95ff-566b7a8a79ee | admin@gmail.com | $2a$12$MLs194KJaFqSswN7KKCbZOixr0xhoKE5HOGPIwhmIU39Um3pkudZu |                |           | admin  | t         |             1 | 2026-06-28 08:33:50.234152+00 | 2026-06-28 08:33:50.234152+00 |                            |                               | 
 5f8391ff-0880-49de-b2ca-1628e6dc988b | gio1c@gmail.com | $2a$12$xg8/g7dUv6SWwolvKgwA/.r5ZwSEafmgtW43NcgrfhLOJk8tyLtDG |                |           | client | f         |             1 | 2026-06-28 08:37:40.294964+00 | 2026-06-28 08:48:00.035397+00 |                            | 2026-06-28 08:48:00.035397+00 | inactividad_automatica
 8f165168-d497-4e77-95fd-3281ab240ee3 | gio2c@gmail.com | $2a$12$Ck6XoUb4QXi0o5RXS3ybc.89Vlk2Gs0Ey4WPK09UmvlL1bL3RCdx. |                |           | client | f         |             1 | 2026-06-28 08:38:24.907509+00 | 2026-06-28 08:50:00.03826+00  | 2026-06-28 08:38:33.797+00 | 2026-06-28 08:50:00.03826+00  | inactividad_automatica
 3225b92c-5136-4dc9-abb2-d301defe5f62 | gio3c@gmail.com | $2a$12$t/lu.ExSKbWp9QuGJfFH0O/AqlV0RkuZTZQ.fqhVtPvgFfU7xRTAO |                |           | client | t         |             1 | 2026-06-28 08:43:50.706304+00 | 2026-06-28 08:50:18.157075+00 | 2026-06-28 08:50:18.155+00 |                               | 
(4 rows)

auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        |        deactivated_at         |  deactivation_reason   
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+-------------------------------+------------------------
 0581a4b7-272c-4b87-95ff-566b7a8a79ee | admin@gmail.com | $2a$12$MLs194KJaFqSswN7KKCbZOixr0xhoKE5HOGPIwhmIU39Um3pkudZu |                |           | admin  | t         |             1 | 2026-06-28 08:33:50.234152+00 | 2026-06-28 08:33:50.234152+00 |                            |                               | 
 5f8391ff-0880-49de-b2ca-1628e6dc988b | gio1c@gmail.com | $2a$12$xg8/g7dUv6SWwolvKgwA/.r5ZwSEafmgtW43NcgrfhLOJk8tyLtDG |                |           | client | f         |             1 | 2026-06-28 08:37:40.294964+00 | 2026-06-28 08:48:00.035397+00 |                            | 2026-06-28 08:48:00.035397+00 | inactividad_automatica
 8f165168-d497-4e77-95fd-3281ab240ee3 | gio2c@gmail.com | $2a$12$Ck6XoUb4QXi0o5RXS3ybc.89Vlk2Gs0Ey4WPK09UmvlL1bL3RCdx. |                |           | client | f         |             1 | 2026-06-28 08:38:24.907509+00 | 2026-06-28 08:50:00.03826+00  | 2026-06-28 08:38:33.797+00 | 2026-06-28 08:50:00.03826+00  | inactividad_automatica
 3225b92c-5136-4dc9-abb2-d301defe5f62 | gio3c@gmail.com | $2a$12$t/lu.ExSKbWp9QuGJfFH0O/AqlV0RkuZTZQ.fqhVtPvgFfU7xRTAO |                |           | client | t         |             1 | 2026-06-28 08:43:50.706304+00 | 2026-06-28 08:56:00.144078+00 | 2026-06-28 08:56:00.142+00 |                               | 
(4 rows)

auth_db=# 




# flujo final

## 1ro se desactivo:
```
auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        |        deactivated_at         |  deactivation_reason   
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+-------------------------------+------------------------
 5088cfb6-dc32-44b4-b674-83fb6bf9227e | admin@gmail.com | $2a$12$7lGfwiuRHSnUMnLB/h8lz.BltMJ0KrnoSL6rETJkHeKPinKd5GMty |                |           | admin  | t         |             1 | 2026-06-28 18:34:03.259687+00 | 2026-06-28 18:34:03.259687+00 |                            |                               | 
 97a7613f-8ab5-4d41-8d75-628e9576cba1 | gio3@gmail.com  | $2a$12$MqFRTiYWx9pffmbFtlIi4.ES2.iguMhhfrrzLoluQqD6ExW96zOG2 |                |           | client | t         |             1 | 2026-06-28 18:49:17.043534+00 | 2026-06-28 18:52:30.587032+00 | 2026-06-28 18:52:30.585+00 |                               | 
 401f1b7a-1ed5-4eb4-97a4-b66a324ec149 | gio2@gmail.com  | $2a$12$/fUOffnNh4K.mVbJLGyH/uZGrJ8daraQ1Tgyk8aUvFxhNxWnYSwXK |                |           | client | f         |             1 | 2026-06-28 18:48:41.63786+00  | 2026-06-28 19:00:00.020684+00 | 2026-06-28 18:49:37.185+00 | 2026-06-28 19:00:00.020684+00 | inactividad_automatica
(3 rows)

auth_db=# 


```


# 2do se elimno el que nunca ingreso
```
uth_db=# 
auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        |        deactivated_at         |  deactivation_reason   
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+-------------------------------+------------------------
 5088cfb6-dc32-44b4-b674-83fb6bf9227e | admin@gmail.com | $2a$12$7lGfwiuRHSnUMnLB/h8lz.BltMJ0KrnoSL6rETJkHeKPinKd5GMty |                |           | admin  | t         |             1 | 2026-06-28 18:34:03.259687+00 | 2026-06-28 18:34:03.259687+00 |                            |                               | 
 97a7613f-8ab5-4d41-8d75-628e9576cba1 | gio3@gmail.com  | $2a$12$MqFRTiYWx9pffmbFtlIi4.ES2.iguMhhfrrzLoluQqD6ExW96zOG2 |                |           | client | t         |             1 | 2026-06-28 18:49:17.043534+00 | 2026-06-28 18:52:30.587032+00 | 2026-06-28 18:52:30.585+00 |                               | 
 401f1b7a-1ed5-4eb4-97a4-b66a324ec149 | gio2@gmail.com  | $2a$12$/fUOffnNh4K.mVbJLGyH/uZGrJ8daraQ1Tgyk8aUvFxhNxWnYSwXK |                |           | client | f         |             1 | 2026-06-28 18:48:41.63786+00  | 2026-06-28 19:00:00.020684+00 | 2026-06-28 18:49:37.185+00 | 2026-06-28 19:00:00.020684+00 | inactividad_automatica
(3 rows)

auth_db=# 

```



## se borro el el 2do que si ingreso:
```bash
auth_db=# select * from auth.users limit 10;
               user_id                |      email      |                        password_hash                         | oauth_provider | oauth_sub |  role  | is_active | token_version |          created_at           |          updated_at           |       last_login_at        |        deactivated_at         |  deactivation_reason   
--------------------------------------+-----------------+--------------------------------------------------------------+----------------+-----------+--------+-----------+---------------+-------------------------------+-------------------------------+----------------------------+-------------------------------+------------------------
 5088cfb6-dc32-44b4-b674-83fb6bf9227e | admin@gmail.com | $2a$12$7lGfwiuRHSnUMnLB/h8lz.BltMJ0KrnoSL6rETJkHeKPinKd5GMty |                |           | admin  | t         |             1 | 2026-06-28 18:34:03.259687+00 | 2026-06-28 18:34:03.259687+00 |                            |                               | 
 97a7613f-8ab5-4d41-8d75-628e9576cba1 | gio3@gmail.com  | $2a$12$MqFRTiYWx9pffmbFtlIi4.ES2.iguMhhfrrzLoluQqD6ExW96zOG2 |                |           | client | f         |             1 | 2026-06-28 18:49:17.043534+00 | 2026-06-28 19:04:00.030923+00 | 2026-06-28 18:52:30.585+00 | 2026-06-28 19:04:00.030923+00 | inactividad_automatica
(2 rows)

auth_db=#

```
# Autenticacion y seguridad

## Sesion

1. Google entrega un ID token al frontend.
2. FastAPI verifica firma, audiencia, expiracion y email verificado.
3. El usuario se busca por `google_subject` o se vincula por email verificado a una cuenta provisionada. Una cuenta nueva solo se asocia automáticamente si su dominio corresponde a una organización activa.
4. El backend firma una sesion propia.
5. La sesion viaja en cookie `HttpOnly`, `SameSite=Lax` y `Secure` en produccion.

El frontend no debe confiar en un rol u organización recibidos desde el navegador. El rol y `organization_id` se leen del usuario persistido y cada endpoint protegido valida ambos en backend.

## Autorizacion

- `CLIENT`: catálogo público por organización; crea/consulta/cancela sus propias reservas dentro de `users.organization_id`.
- `ENCARGADO`: gestiona reservas de su organización; no administra organizaciones ni el catálogo.
- `ADMIN`: gestiona organizaciones y usuarios globalmente, y administra instalaciones, horarios y tarifas de cualquier organización. No consulta ni opera reservas.
- La autorizacion se verifica en el servicio, no solamente en el router.
- Los recursos ajenos deben responder `404` o `403` de forma consistente sin filtrar informacion.
- El scope de instalaciones públicas se resuelve por slug de organización; las reservas autenticadas se filtran por `organization_id` derivado del usuario.
- Constraints/FKs compuestas impiden que una reserva mezcle cliente, instalación y organización.

## Protecciones

- CORS con lista explicita de origenes.
- Rate limit en login, disponibilidad y creacion de reservas.
- Validacion estricta de fechas, UUIDs, importes y textos.
- No usar `dangerouslySetInnerHTML` para contenido de usuario.
- No guardar tokens de Google en la base de datos.
- No registrar cookies, tokens, contraseñas ni datos sensibles.
- Headers: CSP, HSTS en produccion, `X-Content-Type-Options` y `Referrer-Policy`.
- Secretos solo mediante variables de entorno.
- Backups y minimo privilegio para el usuario de PostgreSQL.

## Riesgos principales

| Riesgo | Mitigacion |
|---|---|
| Reserva doble | Constraint exclusion transaccional |
| IDOR | Verificacion de propietario en servicio |
| Fuga entre organizaciones | Filtros de tenant en repositorios y FKs compuestas en PostgreSQL |
| Token falso | Verificacion oficial de Google |
| SMTP expuesto | Secretos fuera del repositorio |
| XSS | Escape por defecto de React y validacion |

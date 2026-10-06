# Autenticacion y seguridad

## Sesion

1. Google entrega un ID token al frontend.
2. FastAPI verifica firma, audiencia, expiracion y email verificado.
3. El usuario se crea o actualiza por `google_subject`.
4. El backend firma una sesion propia.
5. La sesion viaja en cookie `HttpOnly`, `SameSite=Lax` y `Secure` en produccion.

El frontend no debe confiar en un rol recibido desde el navegador. Cada endpoint protegido consulta la sesion y valida el rol en backend.

## Autorizacion

- `CLIENT`: catalogo, disponibilidad, creacion y operaciones sobre sus reservas.
- `ADMIN`: todas las operaciones administrativas.
- La autorizacion se verifica en el servicio, no solamente en el router.
- Los recursos ajenos deben responder `404` o `403` de forma consistente sin filtrar informacion.

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
| Token falso | Verificacion oficial de Google |
| SMTP expuesto | Secretos fuera del repositorio |
| XSS | Escape por defecto de React y validacion |

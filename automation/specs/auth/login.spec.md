# Spec - Login

## Scenarii

### 1. Login cu date valide
- **Given** utilizatorul are cont activ
- **When** introduce email si parola corecta
- **Then** este autentificat si redirectionat la Dashboard

### 2. Login cu parola invalida
- **Given** utilizatorul are cont activ
- **When** introduce parola gresita
- **Then** primeste mesaj de eroare

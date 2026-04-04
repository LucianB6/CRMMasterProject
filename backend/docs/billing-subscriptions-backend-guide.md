# Billing And Subscriptions Backend Guide

## Scope

Acest document descrie ce a fost implementat in backend pentru flow-ul de abonamente, Stripe Checkout, validare pre-checkout, provisioning dupa plata si entitlement/usage enforcement.

Scopul este sa existe o referinta unica pentru:
- ce face backend-ul acum
- de ce au fost facute aceste schimbari
- care este directia arhitecturala
- ce asteptari trebuie sa aiba frontend-ul si echipa de produs
- ce scenarii trebuie sa treaca in mod normal

Documentul este orientat pe executie si verificare, nu doar pe descriere generala.

## Obiectivul general

Backend-ul trebuie sa sustina un produs SaaS cu planuri platite, limite reale de utilizare si control clar asupra entitlement-urilor.

Directia aleasa este:
- Stripe este sursa de adevar pentru plata si statusul abonamentului
- backend-ul este sursa de adevar pentru provisioning, plan intern, usage si access control
- frontend-ul nu decide entitlement-urile, doar le afiseaza
- limitarile se aplica in backend, nu doar in UI

## Ce a fost implementat

### 1. Stripe subscription flow

A fost implementat flow-ul Stripe pentru:
- `POST /create-checkout-session`
- `POST /create-portal-session`
- `POST /webhook`

Comportamentul principal:
- checkout si portal raspund cu `303 See Other`
- webhook valideaza semnatura Stripe
- webhook proceseaza:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- exista idempotency pe `event.id`

Scop:
- frontend-ul sa poata porni checkout si billing portal
- backend-ul sa poata sincroniza statusul intern al abonamentului

### 2. Pending signup pentru checkout platit

A fost introdus flow-ul corect pentru signup intern + plata:
- inainte de checkout se creeaza un `pending signup`
- checkout-ul Stripe primeste `pending_signup_id` in metadata
- dupa plata, backend-ul finalizeaza:
  - `User`
  - `Company`
  - `CompanyMembership`

Exista si endpoint de finalizare:
- `POST /auth/checkout/finalize`

Scop:
- sa nu depindem de redirect-ul browserului ca sursa de adevar
- sa nu pierdem datele utilizatorului dupa plata
- sa putem emite JWT dupa confirmarea checkout-ului

### 3. Validare pre-checkout

A fost implementat:
- `GET /auth/checkout/validate`

Endpoint-ul:
- nu creeaza user
- nu creeaza checkout session
- valideaza strict datele necesare pentru flow-ul de signup platit
- raspunde cu contract predictibil pentru frontend:
  - `message`
  - `fieldErrors`

Scop:
- frontend-ul poate opri checkout-ul inainte sa trimita utilizatorul in Stripe
- erorile pot fi afisate pe campuri exact

### 4. Model intern pentru planuri

A fost introdus un catalog intern de planuri in cod:
- `STARTER`
- `GROWTH`
- `ENTERPRISE`

Pentru fiecare plan exista in prezent:
- `includedSeats`
- limita pentru `AI_ASSISTANT`
- limita pentru `AI_INSIGHTS`

Scop:
- backend-ul sa aiba o definitie interna coerenta a entitlement-urilor
- schimbarea planului sa poata modifica imediat limitele aplicate

### 5. Usage tracking

A fost introdus tracking lunar de utilizare in DB pentru:
- `AI_ASSISTANT`
- `AI_INSIGHTS`

Implementarea foloseste:
- `company_usage_balances`
- perioada calculata pe inceput de luna

Scop:
- sa existe limite reale, nu doar declarative
- sa poata fi afisat usage-ul in UI
- sa poata fi blocata utilizarea cand limita este depasita

### 6. Enforcement backend pentru AI

Limitarile sunt aplicate deja in backend pentru:
- AI Assistant in `ChatbotService`
- AI Insights in `LeadDetailsService`

Comportament:
- daca limita este depasita, backend-ul raspunde cu `403`
- mesajele sunt de tip:
  - `Plan limit reached for ai_assistant`
  - `Plan limit reached for ai_insights`

Scop:
- limitarile sa fie reale indiferent ce face frontend-ul

### 7. Seat enforcement

A fost introdus control pentru numarul de locuri pe companie:
- invitatii noi sunt blocate daca limita este atinsa
- creare directa de agent este blocata daca limita este atinsa
- acceptarea invitatiei este blocata daca limita este atinsa

Pentru invitatii:
- se iau in calcul `active seats + pending invites`

Scop:
- sa nu poata fi depasita limita planului prin invitatii rezervate in exces

### 8. Billing endpoints pentru UI

Au fost introduse endpoint-uri pentru frontend:
- `GET /billing/current-plan`
- `GET /billing/usage`
- `GET /billing/entitlements`

Scop:
- frontend-ul sa aiba un contract stabil pentru afisare si gating

## Ce endpoint-uri exista acum

### Publice

- `GET /auth/checkout/validate`
- `POST /create-checkout-session`
- `POST /create-portal-session`
- `POST /webhook`
- `POST /auth/checkout/finalize`

### Autentificate

- `GET /billing/current-plan`
- `GET /billing/usage`
- `GET /billing/entitlements`
- `GET /auth/me`

## Ce trebuie sa inteleaga frontend-ul

Frontend-ul trebuie sa urmeze exact acesti pasi pentru flow-ul intern de signup platit:

1. Colecteaza toate datele:
   - `lookup_key`
   - `email`
   - `password`
   - `retype_password`
   - `first_name`
   - `last_name`
   - `company_name`

2. Apeleaza:
   - `GET /auth/checkout/validate`

3. Daca raspunsul este valid:
   - trimite `POST /create-checkout-session`

4. Stripe redirectioneaza utilizatorul inapoi cu:
   - `?success=true&session_id=...`

5. Frontend-ul apeleaza:
   - `POST /auth/checkout/finalize`

6. Backend-ul raspunde cu JWT daca signup-ul este finalizat.

7. Dupa autentificare, frontend-ul poate citi:
   - `GET /billing/current-plan`
   - `GET /billing/usage`
   - `GET /billing/entitlements`

## Asteptari functionale

### Asteptari minime

Intr-o situatie normala, sistemul trebuie sa:
- permita checkout pentru un plan valid
- finalizeze contul dupa plata
- sincronizeze statusul abonamentului din Stripe
- afiseze planul curent in UI
- afiseze usage-ul curent in UI
- blocheze consumul AI peste limita
- blocheze adaugarea de noi membri peste limita de seats

### Asteptari de consistenta

Frontend-ul si backend-ul trebuie sa afiseze aceeasi realitate:
- acelasi plan activ
- acelasi status al abonamentului
- aceleasi limite
- acelasi remaining usage

### Asteptari de securitate

Nu trebuie:
- sa se bazeze doar pe UI pentru limitari
- sa se expuna chei Stripe
- sa se emita access doar pe baza redirect-ului browserului
- sa se permita depasirea limitelor prin request-uri directe

## Scenarii care trebuie sa treaca

### Scenariul 1: signup intern + plata Starter

Pasii:
- utilizatorul completeaza formularul de signup
- frontend-ul valideaza prin `GET /auth/checkout/validate`
- frontend-ul porneste checkout
- utilizatorul plateste in Stripe
- webhook-ul confirma plata
- frontend-ul apeleaza `POST /auth/checkout/finalize`
- utilizatorul primeste JWT si este logat

Rezultatul asteptat:
- exista `User`
- exista `Company`
- exista `CompanyMembership`
- compania are `planCode=STARTER`
- compania are `subscriptionStatus=active`

### Scenariul 2: utilizatorul isi schimba planul

Pasii:
- utilizatorul schimba planul din Stripe sau prin flow dedicat
- Stripe emite `customer.subscription.updated`
- webhook-ul actualizeaza planul/statusul intern
- frontend-ul reciteste `GET /billing/current-plan` si `GET /billing/entitlements`

Rezultatul asteptat:
- noul plan este vizibil in backend
- noile limite sunt aplicate
- seat limit si AI limits reflecta noul plan

Nota:
- in acest moment, planul intern se bazeaza in principal pe `planCode` deja stocat si pe mapping-ul din backend
- recomandarea este sa urmeze un pas ulterior de intarire a maparii `price_id -> plan_code`

### Scenariul 3: limita AI assistant este atinsa

Pasii:
- compania ajunge la limita lunara
- utilizatorul incearca un nou chat in assistant

Rezultatul asteptat:
- backend raspunde cu `403`
- mesajul arata clar ca limita planului a fost atinsa
- frontend-ul afiseaza blocarea si poate directiona utilizatorul spre upgrade

### Scenariul 4: limita AI insights este atinsa

Pasii:
- compania ajunge la limita de insights
- utilizatorul incearca regenerate insights

Rezultatul asteptat:
- backend raspunde cu `403`
- nu se consuma usage suplimentar
- frontend-ul afiseaza starea corecta

### Scenariul 5: managerul invita utilizatori pana la limita

Pasii:
- managerul trimite invitatii
- sistemul numara `active seats + pending invites`

Rezultatul asteptat:
- cand limita este atinsa, invitatiile noi sunt refuzate
- raspunsul este `403 Plan seat limit reached`

### Scenariul 6: acceptarea unei invitatii cand firma este full

Pasii:
- firma are toate locurile ocupate
- un utilizator incearca sa accepte invitatia

Rezultatul asteptat:
- acceptarea este blocata
- nu se creeaza membership nou
- sistemul raspunde cu eroare clara

### Scenariul 7: billing portal

Pasii:
- userul intra in billing portal
- modifica date de facturare sau alte setari permise

Rezultatul asteptat:
- redirect-ul la Stripe portal functioneaza
- revenirea in aplicatie nu rupe sesiunea
- schimbari relevante ajung eventual in webhook

## Ce trebuie urmarit la testare

### Stripe

Trebuie urmarit:
- `lookup_key` corect
- `price` activ si recurring
- aceeasi lume test/live pentru chei si price-uri
- `success_url` si `cancel_url` corecte
- webhook secret corect

### Backend

Trebuie verificat:
- migrarea DB este aplicata
- `pending_signups` functioneaza
- `processed_stripe_events` previne dubluri
- `company_usage_balances` se actualizeaza corect
- `company.planCode` si `subscriptionStatus` sunt sincronizate

### Frontend

Trebuie verificat:
- form validation inainte de checkout
- finalize dupa success redirect
- polling sau retry daca provisioning-ul este in curs
- refresh corect al endpoint-urilor de billing dupa modificari

## Ce nu este complet inchis inca

Exista in continuare zone care trebuie intarite in pasii urmatori:

### 1. Mapping mai strict Stripe -> plan intern

Directia corecta:
- `price_id` sau `lookup_key` sa fie mapat explicit la `plan_code`
- schimbarile de subscription sa actualizeze ferm planul intern

### 2. Google signup + Stripe

Flow-ul intern email/parola este acoperit.
Google signup + Stripe are nevoie inca de integrare coerenta cu pending signup / provisioning.

### 3. Add-ons sau usage extra

Momentan modelul este:
- plan fix
- limite fixe

Nu exista inca:
- pachete extra de AI credits
- overage billing
- rollover usage

### 4. Yearly billing

Planurile interne nu trateaza inca diferit:
- monthly
- yearly

Aceasta diferenta va trebui modelata explicit daca este introdusa in produs.

## Directia recomandata

Ordinea recomandata pentru etapele urmatoare este:

1. intarirea maparii `Stripe price -> internal plan`
2. suport clar pentru upgrade/downgrade
3. suport pentru yearly billing
4. suport pentru add-on usage
5. suport complet pentru Google signup + Stripe
6. dashboard admin/billing mai bogat pentru monitoring intern

## Checklist operational

Acest checklist ar trebui urmat de fiecare data cand se face o schimbare pe billing:

- planul exista in Stripe
- `lookup_key` este valid
- mapping-ul intern al planului este actualizat
- webhook-ul proceseaza corect update-urile
- `current-plan` raspunde corect
- `usage` raspunde corect
- `entitlements` raspunde corect
- AI assistant este permis sau blocat corect
- AI insights sunt permise sau blocate corect
- seat limit este permis sau blocat corect
- schimbarea de plan reflecta noile limite

## Asteptarea finala

Rezultatul dorit este un backend care:
- factureaza corect
- provisioneaza corect
- aplica corect limitele
- expune clar entitlement-urile catre frontend
- ramane consistent dupa checkout, portal si webhook

Daca unul dintre aceste lucruri nu este adevarat, flow-ul de abonamente nu este complet functional si trebuie tratat ca defect operational, nu doar cosmetic.

# Pahado Ki Duniya - Connected Supabase Version

## 1. Database
Run `supabase/schema.sql` in the Supabase SQL Editor.

This version creates/updates:
- properties
- bookings
- admins
- secure admin RLS policies

## 2. Create your admin login
In Supabase:
Authentication -> Users -> Add user -> Create new user.

Create an email and password you control.

Then copy that user's UUID and run:

```sql
insert into public.admins (user_id)
values ('PASTE_USER_UUID_HERE');
```

## 3. Open the website
The project is already configured with the supplied Supabase Project URL and publishable key.

Never replace the publishable key with the Secret key.

## 4. Admin
Open the website -> Admin -> sign in.
You can then add and delete stays. New published stays appear on the homepage automatically.

## 5. Booking
A customer booking request is saved to the `bookings` table and then opens WhatsApp for the property contact.

## 6. Production
Before launch, replace sample property photos/phone numbers, add image upload storage, add booking validation/rate limiting, and connect a custom domain.

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create uuid_generate_v7 function
-- Based on the UUIDv7 specification (RFC 9562)
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  -- Get current timestamp in milliseconds since Unix epoch
  unix_ts_ms := substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  
  -- Generate random bytes for the rest of the UUID
  -- 48 bits timestamp + 12 bits version/variant + 62 bits random
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  
  -- Set version (7) in the 7th byte: 0111xxxx
  uuid_bytes := set_byte(uuid_bytes, 6, (b'01110000' | (get_byte(uuid_bytes, 6) & b'00001111'))::int);
  
  -- Set variant (10) in the 9th byte: 10xxxxxx
  uuid_bytes := set_byte(uuid_bytes, 8, (b'10000000' | (get_byte(uuid_bytes, 8) & b'00111111'))::int);
  
  RETURN encode(uuid_bytes, 'hex')::uuid;
END
$$
LANGUAGE plpgsql
VOLATILE;

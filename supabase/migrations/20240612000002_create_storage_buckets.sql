-- Create all required storage buckets

-- Create selfies bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
SELECT 'selfies', 'selfies', true, false, NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'selfies');

-- Create vehicle-inspections bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
SELECT 'vehicle-inspections', 'vehicle-inspections', true, false, NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'vehicle-inspections');

-- Create customers bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
SELECT 'customers', 'customers', true, false, NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'customers');

-- Create drivers bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
SELECT 'drivers', 'drivers', true, false, NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'drivers');

-- Create cars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
SELECT 'cars', 'cars', true, false, NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'cars');

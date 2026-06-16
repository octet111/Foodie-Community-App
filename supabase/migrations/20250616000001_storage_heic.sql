-- iPhone / Mac の HEIC 形式を shop-images で許可
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif'
]
where id = 'shop-images';

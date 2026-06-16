-- 全 Storage バケットのファイルサイズ上限を 15MB に統一
update storage.buckets
set file_size_limit = 15728640
where id in ('shop-images', 'community', 'event-photos');

-- ============================================================
-- ORBIT — Ek Politikalar ve Storage
-- 0001_init.sql'den SONRA SQL Editor'da çalıştır
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- BÖLÜM 1: EKSİK RLS POLİTİKALARI
-- ══════════════════════════════════════════════════════════════

-- ── Sunucu üyeliği ────────────────────────────────────────────
CREATE POLICY "Sunucuya katıl"
  ON server_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sunucudan ayrıl"
  ON server_members FOR DELETE
  USING (auth.uid() = user_id);

-- ── Kategori ve kanal oluşturma (sahip/admin) ─────────────────
CREATE POLICY "Kategori oluştur"
  ON server_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_id = server_categories.server_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Kanal oluştur"
  ON server_channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_id = server_channels.server_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ── Konuşmalar (DM) ───────────────────────────────────────────
CREATE POLICY "Konuşma oluştur"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Katılımcı ekle"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Okundu güncelle"
  ON conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- ── Sunucu üye sayısı trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_server_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE servers SET member_count = member_count + 1 WHERE id = NEW.server_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.server_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_server_member_count
  AFTER INSERT OR DELETE ON server_members
  FOR EACH ROW EXECUTE FUNCTION update_server_member_count();


-- ══════════════════════════════════════════════════════════════
-- BÖLÜM 2: STORAGE BUCKET POLİTİKALARI
-- (Bucket'ları Dashboard'dan oluşturduktan sonra çalıştır)
-- ══════════════════════════════════════════════════════════════

-- ── post-images ───────────────────────────────────────────────
CREATE POLICY "Post resimleri herkese açık"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Post resmi yükle"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Kendi post resmini sil"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── avatars ───────────────────────────────────────────────────
CREATE POLICY "Avatarlar herkese açık"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar yükle/güncelle"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Avatar upsert"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── banners ───────────────────────────────────────────────────
CREATE POLICY "Bannerlar herkese açık"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "Banner yükle"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Banner upsert"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ── reels ─────────────────────────────────────────────────────
CREATE POLICY "Reel videoları herkese açık"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reels');

CREATE POLICY "Reel video yükle"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reels' AND auth.uid() IS NOT NULL);

-- ── thumbnails ────────────────────────────────────────────────
CREATE POLICY "Thumbnaillar herkese açık"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Thumbnail yükle"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails' AND auth.uid() IS NOT NULL);

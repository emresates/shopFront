# form — ShopApi frontend

Next.js App Router, strict TypeScript, Tailwind CSS 4 ve TanStack Query ile gerçek ShopApi uç noktalarına bağlı e-ticaret arayüzü. Mock ürün, sipariş, ödeme, kupon veya değerlendirme içermez.

## Çalıştırma

Node.js 20.9+ gerekir.

```sh
npm ci
cp .env.example .env.local
# NEXT_PUBLIC_API_URL değerini çalışan ShopApi adresiyle değiştirin.
npm run dev
```

Mevcut `.env` kullanılıyorsa kopyalama gerekmiyor. `.env.local`, `.env` üzerine önceliklidir. Uygulama: http://localhost:3000. Backend CORS politikasında bu frontend origin'ine izin verilmelidir. Public API URL build sırasında client bundle'a alınır; değişiklikten sonra yeniden build gerekir. URL kodda sabit değildir.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm run format` kaynak dosyalarını Prettier ile düzenler. Lockfile sürümleri sabitler.

## Sayfalar

| Alan    | Rotalar                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------- |
| Vitrin  | `/`, `/products`, `/products/[id]`                                                              |
| Oturum  | `/login`, `/register`                                                                           |
| Müşteri | `/favorites`, `/cart`, `/checkout`, `/orders`, `/orders/[id]`, `/account`, `/account/addresses` |
| Admin   | `/admin`, `/admin/products`, `/admin/categories`, `/admin/orders`                               |

Route ve layout dosyaları Server Component'tir. Ürün detayının ilk verisi sunucudan gelir; bulunamayan ürün Next.js 404 ekranını kullanır. Formlar, sorgular, sepet ve diğer etkileşimli alanlar Client Component sınırlarında çalışır. Suspense, loading, error ve not-found sınırları vardır.

## Veri ve oturum

- `lib/api/client.ts`: base URL, JSON envelope, Bearer header, 20 saniye timeout, ağ hataları, 401/403 ve backend mesajları.
- `lib/api/*`: verilen endpoint sözleşmesine göre ayrılmış API modülleri. Component içinde dağınık `fetch` yoktur.
- `types/index.ts`: generic `ApiResponse<T>`, pagination ve domain tipleri; explicit `any` kullanılmaz.
- AuthProvider JWT payload'ından standart ve Microsoft claim adlarını okur. Bu decode, imza doğrulama veya yetkilendirme değildir; backend esas otoritedir.
- Access token `sessionStorage` içinde sekme oturumu boyunca tutulur. Storage kullanılamazsa yalnızca bellekte tutulur. Sayfa yenilemede oturum geri yüklenir; logout, 401 ve süre dolumunda silinir. Refresh endpointi kullanılmaz.
- Oturum değişiminde query cache temizlenir. Kullanıcı verileri kullanıcı kimliğiyle query key'lerine ayrılır. Yetkisiz sayfalar dönüş URL'siyle login'e yönlenir; Customer admin alanını göremez.
- Fiyatlar TRY/tr-TR, tarihler tr-TR olarak gösterilir. Açık/koyu tema tercihi yerel storage'da saklanır.

## Akışlar

- Ürün arama, kategori, min/max fiyat ve sayfa URL query parametreleriyle paylaşılabilir. Pagination metadata backend'den gelir. Ürün kartında ana görsel, aksi halde ilk görsel veya görselsiz durum gösterilir.
- Favori ekleme/çıkarma sonrası ortak query invalidation kartları ve favori sayfasını günceller.
- Sepet ekleme POST, adet güncelleme PUT, silme/temizleme DELETE uç noktalarını kullanır. Tekrar ekleme miktar artışı backend'e bırakılır. Header adedi backend `totalQuantity` değeridir.
- Adres oluşturma, düzenleme, silme ve varsayılan seçimi desteklenir. Dialoglar native `<dialog>` ile klavye/focus yönetimi sağlar.
- Checkout yalnızca `{ addressId }` gönderir. UserId, ürün fiyatı veya toplam gönderilmez. Başarıda sepet refetch edilir, sipariş listesi invalidation alır ve sipariş detayına geçilir. Ödeme entegrasyonu yoktur; belirsiz ağ hatasında otomatik sipariş tekrarı yapılmaz.
- Müşteri, `Pending`, `Paid` veya `Preparing` durumundaki kendi siparişini `/orders` ve `/orders/[id]` sayfalarından onay dialog'u ile iptal edebilir (`PATCH /api/orders/{id}/cancel`, body yok). Başarıda sipariş önbellekte `Cancelled` yapılır, liste yeniden okunur ve buton kalkar.
- `/admin/orders` tüm siparişleri `GET /api/orders/admin` ile listeler. Durum seçimi yalnızca izin verilen geçişleri gösterir, onay dialog'u sonrası `PATCH /api/orders/{id}/status` gönderir; 409 mesajı toast ile gösterilir ve liste yeniden okunur. Geçiş kuralları `lib/order-status.ts` içinde yalnızca UX içindir; yetki ve durum doğrulaması backend'dedir. Admin durum kontrolleri müşteri sayfalarında gösterilmez. Backend tekil sipariş detayını yalnızca sahibine döndürdüğü için admin detay penceresi liste verisini gösterir.
- Admin ürün ve kategori CRUD, kategori filtreleme, sayfalama, silme onayı ve görsel yönetimi içerir. Birden çok dosya sırayla backend'e `File` ve `IsMain` alanlarıyla gönderilir; multipart Content-Type elle ayarlanmaz. Kısmi yükleme hatasında mevcut görseller tekrar okunur.

## Doğrulama

`tests/` içindeki transport test doubles yalnızca API sözleşmesini test eder; uygulama çalışma zamanında sahte veri kullanmaz. Oturum claim'leri, süresi dolmuş JWT, dış adrese yönlendirme engeli, sipariş body, multipart boundary, pagination, backend ve bağlantı hataları test edilir.

Gerçek ShopApi ile tarayıcı doğrulamalarının kapsamı ve kalan adımlar `VERIFICATION.md` dosyasındadır.

## Dağıtım notları

Frontend'e yalnızca public API URL konur. JWT/Cloudinary secret veya veritabanı bilgisi eklenmez. Access-token tabanlı mevcut sözleşme nedeniyle token JavaScript tarafından okunabilir; frontend XSS korunmasına ve backend authorization kontrollerine bağımlıdır. Backend ileride HttpOnly cookie/refresh desteği eklerse oturum katmanı bu sözleşmeyle birlikte değiştirilebilir.

Production bağımlılıkları `npm audit --omit=dev` kontrolünde açık bildirmedi. Tam audit, Next ESLint'in `fast-glob → micromatch → braces` geliştirme zincirinde 5 ilişkili yüksek seviye bulgu bildiriyor; önerilen otomatik çözüm Next 14'e downgrade olduğu için uygulanmadı. Bu zincir runtime bundle'a dahil değildir.

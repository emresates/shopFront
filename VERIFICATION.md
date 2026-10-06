# Doğrulama — 6 Ekim 2026

## Sonuçlar

- `npm run build`: başarılı; tüm istenen sayfalar derlendi.
- `npm run lint`: başarılı, hata veya uyarı yok.
- `npm run typecheck`: başarılı.
- `npm test`: 10 test başarılı.
- `npm audit --omit=dev`: 0 açık. Geliştirme zinciri notu README'de.

## Gerçek ShopApi ve tarayıcı

Tarayıcı `http://localhost:3000`, backend mevcut `.env` içindeki `NEXT_PUBLIC_API_URL` üzerinden kullanıldı. Uygulamanın API yanıtları değiştirilmedi veya taklit edilmedi.

| Akış                       | Kanıt / durum                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Ana sayfa                  | Gerçek ürünler, kategori adları/sayıları ve Cloudinary görseli yüklendi.                    |
| Ürün listesi               | Gerçek ürün listesi görüntülendi.                                                           |
| Search + kategori + fiyat  | `search=Bilgisayar&categoryId=1&minPrice=10&maxPrice=30` tek uygun ürünü gösterdi.          |
| Filtre seçiminin korunması | Kategori sorgusu sonradan yüklendiğinde select DOM değeri `1` olarak doğrulandı.            |
| Boş sonuç                  | Eşleşmeyen arama backend'den 0 ürün döndürdü; tasarımlı boş durum gösterildi.               |
| Ürün detayı                | Gerçek ürün adı, fiyat, stok, açıklama, görsel, thumbnail ve adet kontrolleri görüntülendi. |
| Görselsiz ürün             | Placeholder gösterildi.                                                                     |
| Bulunamayan ürün           | Olmayan ürün ID'si Next.js 404 ekranını gösterdi.                                           |
| Oturumsuz sepete ekleme    | `/login?next=%2Fproducts%2F1` yönlendirmesi doğrulandı.                                     |
| Oturumsuz admin erişimi    | `/admin/products` → `/login?next=%2Fadmin%2Fproducts` doğrulandı.                           |
| Mobil                      | 390 px ürün listesi/detayında `scrollWidth === innerWidth === 390`; yatay taşma yok.        |
| Tema                       | Mobil koyu tema ve masaüstü açık tema ekran görüntüleri incelendi.                          |
| Login formu                | Mobil e-posta/şifre alanları ve kayıt linki görüntülendi.                                   |
| Tarayıcı hataları          | Agent-browser oturumunda JavaScript exception veya framework error overlay saptanmadı.      |

## Henüz uçtan uca doğrulanmayanlar

Customer/Admin test hesabı verilmedi. Başarılı kayıt/giriş, favori ekleme-çıkarma, sepet mutasyonları, adres CRUD, sipariş oluşturma ve Admin CRUD/görsel upload işlemleri gerçek yetkili oturumda çalıştırılmadı. Bu akışlar implement edildi; başarıları yalnızca build sonucundan varsayılmadı.

Pagination metadata gerçek API'den okundu, ancak mevcut veri bir sayfadan az olduğu için çok sayfalı ileri/geri gezinme gerçek veride denenmedi. Customer'ın admin paneline alınmaması kodda role guard ile uygulanır; gerçek Customer oturumunda ayrıca doğrulanmalıdır.

## Yetkili hesapla tamamlanacak kontrol listesi

1. Register/login; sayfa yenileme, logout ve süre dolumu.
2. Favorite add/remove; kart ve favori sayfasının birlikte güncellenmesi.
3. Cart add, aynı ürünü tekrar ekleme, quantity update, remove ve clear; header sayacı.
4. Adres create/default/edit/delete; dialog klavye kontrolü.
5. Checkout adres seçimi/yeni adres; sipariş oluşturma; sepetin boşalması.
6. Sipariş listesi, detay ve teslimat snapshot'ı.
7. Admin ürün create/update/delete ve kategori CRUD; dolu kategorinin silinememesi.
8. Çoklu görsel upload, ana görsel seçimi, görsel silme ve kısmi upload hatası.
9. Customer → admin erişim engeli, backend 401/403 ve stok yetersizliği mesajları.
10. Yeterli gerçek ürünle pagination.

"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import type { Address, AddressInput } from "@/types";
import { validateAddress } from "@/lib/validation";
import { addressesApi } from "@/lib/api/addresses";
import { errorMessage } from "@/lib/format";
import { useAuth, useToast } from "./providers";
import { Button, Empty, ErrorState, Modal, PageTitle, Skeleton } from "./ui";
export function useAddresses() {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["addresses", currentUser?.id],
    queryFn: addressesApi.list,
    enabled: !!currentUser,
  });
}
export function AddressForm({
  address,
  close,
  saved,
}: {
  address?: Address;
  close: () => void;
  saved?: (id: number) => void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: async (input: AddressInput) => {
      validateAddress(input);
      return address
        ? addressesApi.update(address.id, input)
        : addressesApi.create(input);
    },
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["addresses"] });
      toast("Adres kaydedildi.");
      if (result.data?.id) saved?.(result.data.id);
      close();
    },
  });
  return (
    <Modal
      title={address ? "Adresi düzenle" : "Yeni adres ekle"}
      close={() => {
        if (!mutation.isPending) close();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mutation.isPending) return;
          const form = new FormData(e.currentTarget);
          const text = (key: string) => String(form.get(key) || "").trim();
          mutation.mutate({
            title: text("title"),
            fullName: text("fullName"),
            phone: text("phone"),
            city: text("city"),
            district: text("district"),
            addressLine: text("addressLine"),
            postalCode: text("postalCode") || null,
            isDefault: form.get("isDefault") === "on",
          });
        }}
      >
        <label>
          Adres başlığı
          <input
            name="title"
            defaultValue={address?.title}
            required
            maxLength={100}
            placeholder="Ev, iş…"
          />
        </label>
        <label>
          Ad soyad
          <input
            name="fullName"
            defaultValue={address?.fullName}
            required
            autoComplete="name"
          />
        </label>
        <label>
          Telefon
          <input
            name="phone"
            type="tel"
            defaultValue={address?.phone}
            required
            autoComplete="tel"
          />
        </label>
        <div className="form-row">
          <label>
            İl
            <input
              name="city"
              defaultValue={address?.city}
              required
              autoComplete="address-level1"
            />
          </label>
          <label>
            İlçe
            <input
              name="district"
              defaultValue={address?.district}
              required
              autoComplete="address-level2"
            />
          </label>
        </div>
        <label>
          Açık adres
          <textarea
            name="addressLine"
            defaultValue={address?.addressLine}
            required
            rows={3}
            autoComplete="street-address"
          />
        </label>
        <label>
          Posta kodu <span className="muted">(isteğe bağlı)</span>
          <input
            name="postalCode"
            defaultValue={address?.postalCode ?? ""}
            autoComplete="postal-code"
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={address?.isDefault}
          />
          Varsayılan adresim olsun
        </label>
        {mutation.error && (
          <p className="field-error" role="alert">
            {mutation.error.message}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            className="btn-secondary"
            onClick={close}
            disabled={mutation.isPending}
          >
            Vazgeç
          </Button>
          <Button type="submit" pending={mutation.isPending}>
            Adresi kaydet
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Addresses() {
  const addresses = useAddresses();
  const client = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => addressesApi.remove(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["addresses"] });
      toast("Adres silindi.");
      setDeleting(null);
    },
    onError: (error) => toast(errorMessage(error), true),
  });
  return (
    <>
      <PageTitle
        eyebrow="HESABIM"
        title="Adreslerim."
        description="Siparişlerinin ulaşacağı yerler."
      >
        <Button onClick={() => setEditing("new")}>
          <Plus size={17} />
          Yeni adres
        </Button>
      </PageTitle>
      {addresses.isPending ? (
        <Skeleton cards={3} />
      ) : addresses.isError ? (
        <ErrorState
          error={addresses.error}
          retry={() => void addresses.refetch()}
        />
      ) : addresses.data?.data?.length ? (
        <div className="address-grid">
          {addresses.data.data.map((a) => (
            <article key={a.id} className="address-card">
              <div className="card-heading">
                <MapPin size={22} />
                <h3>{a.title}</h3>
                {a.isDefault && <span className="badge">Varsayılan</span>}
              </div>
              <strong>{a.fullName}</strong>
              <p>{a.addressLine}</p>
              <p>
                {a.district} / {a.city} {a.postalCode}
              </p>
              <p className="muted">{a.phone}</p>
              <div className="form-actions">
                <Button className="btn-secondary" onClick={() => setEditing(a)}>
                  <Pencil size={15} />
                  Düzenle
                </Button>
                <button
                  className="icon-btn danger"
                  aria-label={`${a.title} adresini sil`}
                  onClick={() => setDeleting(a)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="Henüz kayıtlı adresiniz yok."
          description="Yeni adres ekleyerek alışverişini kolaylaştır."
        />
      )}
      {editing && (
        <AddressForm
          address={editing === "new" ? undefined : editing}
          close={() => setEditing(null)}
        />
      )}{" "}
      {deleting && (
        <Modal
          title="Adres silinsin mi?"
          close={() => {
            if (!remove.isPending) setDeleting(null);
          }}
        >
          <p>“{deleting.title}” adresi kaldırılacak.</p>
          <div className="form-actions">
            <Button
              className="btn-secondary"
              disabled={remove.isPending}
              onClick={() => setDeleting(null)}
            >
              Vazgeç
            </Button>
            <Button
              className="btn-danger"
              pending={remove.isPending}
              onClick={() => remove.mutate(deleting.id)}
            >
              Adresi sil
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

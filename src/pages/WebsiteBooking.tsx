import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./Index";
import Book from "./app/Book";
import "@/styles/website-booking.css";

/** SiteBooking.jsx's modal over the website, with real controls and an accessible focus trap. */
export default function WebsiteBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const prefill = useRef({
    buyer: user?.id ?? null,
    address: typeof location.state?.bookingAddress === "string" ? location.state.bookingAddress.slice(0, 240) : "",
  });
  useEffect(() => {
    // Keep the address out of the URL and remove it from browser history after consumption.
    if (location.state?.bookingAddress) {
      const clean = new URLSearchParams(location.search);
      clean.delete("address"); clean.delete("area");
      navigate(`${location.pathname}${clean.size ? `?${clean}` : ""}`, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  return <><Index /><Dialog.Root open onOpenChange={open => { if (!open) navigate("/"); }}>
    <Dialog.Portal><Dialog.Overlay className="xoot-site-booking-scrim" />
      <Dialog.Content className="xoot-site-booking-dialog">
        <Dialog.Title className="sr-only">Book a visit</Dialog.Title>
        <Dialog.Description className="sr-only">Choose your service, place, date and crew, then review your quote.</Dialog.Description>
        <Book variant="website" initialAddress={prefill.current.buyer === (user?.id ?? null) ? prefill.current.address : ""} />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root></>;
}

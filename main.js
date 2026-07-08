/* ============================================
   Cherry Coffeeshop — Main JavaScript
   ============================================ */

"use strict";

/* --- Navbar scroll shadow --- */
const navbar = document.querySelector(".navbar");

if (navbar) {
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 10);
  });
}

/* --- Date formatter --- */
function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* --- Recurring events --- */
/* A recurring event has a `recurring` block (label/time/start/end) instead of
   a single `date`. It stays "current" through its whole run and only moves to
   the archive once its end date passes (end: null = ongoing, no auto-archive). */
function isRecurring(event) {
  return Boolean(event.recurring);
}

/* The line shown in place of a formatted date, e.g. "Every Saturday, 11:00–13:00" */
function recurrenceLabel(recurring) {
  return recurring.time
    ? `${recurring.label}, ${recurring.time}`
    : recurring.label;
}

/* --- Build a single event card element --- */
function createEventCard(event) {
  const card = document.createElement("article");
  card.className = "event-card";

  const posterClass = event.poster ? " event-card__image--poster" : "";
  const badge = isRecurring(event)
    ? `<span class="event-card__badge">Weekly</span>`
    : "";
  const dateLabel = isRecurring(event)
    ? recurrenceLabel(event.recurring)
    : formatDate(event.date);

  card.innerHTML = `
    ${badge}
    <div class="event-card__image-placeholder${posterClass}">
      <span>${event.title}</span>
    </div>
    <div class="event-card__body">
      <p class="event-card__date">${dateLabel}</p>
      <h3 class="event-card__title">${event.title}</h3>
      <p class="event-card__desc">${event.description}</p>
    </div>
  `;

  /* If the image exists, swap the placeholder for a real <img> */
  const img = new Image();
  img.src = event.image;
  img.alt = event.title;
  img.className = "event-card__image" + posterClass;

  img.onload = () => {
    const placeholder = card.querySelector(".event-card__image-placeholder");
    if (placeholder) placeholder.replaceWith(img);
  };

  return card;
}

/* --- Date-based event filtering --- */
function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/* Has the event finished?
   - single event: its day is over (today still counts as current)
   - recurring event: only once its end date has passed (no end = never) */
function isPast(event) {
  if (isRecurring(event)) {
    const end = event.recurring.end;
    return end ? new Date(end + "T00:00:00") < startOfToday() : false;
  }
  return new Date(event.date + "T00:00:00") < startOfToday();
}

/* The date used to order an event within a list */
function sortDate(event) {
  return isRecurring(event)
    ? event.recurring.end || event.recurring.start || ""
    : event.date;
}

/* Current + upcoming events. Recurring/ongoing ones lead (they're what's on
   right now), then single events soonest-first. */
function upcomingEvents(all) {
  return all.filter((event) => !isPast(event)).sort((a, b) => {
    const aRec = isRecurring(a);
    const bRec = isRecurring(b);
    if (aRec !== bRec) return aRec ? -1 : 1;
    const aKey = aRec ? a.recurring.start || "" : a.date;
    const bKey = bRec ? b.recurring.start || "" : b.date;
    return aKey.localeCompare(bKey);
  });
}

/* Past events, most recent first */
function pastEvents(all) {
  return all
    .filter(isPast)
    .sort((a, b) => sortDate(b).localeCompare(sortDate(a)));
}

/* --- Fetch all events, then render the subset chosen by selectFn --- */
async function loadEvents(
  jsonPath,
  containerSelector,
  selectFn,
  emptyMessage = "No events to show right now — check back soon!"
) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  /* Show loading state */
  container.innerHTML = '<div class="loading">Loading events…</div>';

  try {
    const response = await fetch(jsonPath);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const all = await response.json();
    const events = selectFn(all);

    container.innerHTML = "";

    if (events.length === 0) {
      container.innerHTML = `<p class="events-empty">${emptyMessage}</p>`;
      return;
    }

    events.forEach((event) => {
      container.appendChild(createEventCard(event));
    });
  } catch (err) {
    console.error("Failed to load events:", err);
    container.innerHTML =
      '<p class="error-message">Could not load events. Please try again later.</p>';
  }
}

/* --- Smooth scroll-to-top for navbar logo on home page --- */
const navLogo = document.querySelector('.navbar__logo[href="#hero"]');

if (navLogo) {
  navLogo.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

/* --- Gallery lightbox (tap to open, swipe / arrows to navigate) --- */
(function initGalleryLightbox() {
  const images = Array.from(
    document.querySelectorAll(".gallery-grid__item img")
  );
  const lightbox = document.getElementById("lightbox");
  if (!images.length || !lightbox) return;

  const lbImg = lightbox.querySelector(".lightbox__img");
  const lbCaption = lightbox.querySelector(".lightbox__caption");
  const lbCounter = lightbox.querySelector(".lightbox__counter");
  const btnPrev = lightbox.querySelector(".lightbox__nav--prev");
  const btnNext = lightbox.querySelector(".lightbox__nav--next");
  const btnClose = lightbox.querySelector(".lightbox__close");

  let currentIndex = 0;
  let lastFocused = null;

  /* Show the image at the given index, wrapping around both ends */
  function showImage(index) {
    currentIndex = (index + images.length) % images.length;
    const source = images[currentIndex];
    lbImg.src = source.src;
    lbImg.alt = source.alt;
    lbCaption.textContent = source.alt;
    lbCounter.textContent = `${currentIndex + 1} / ${images.length}`;

    /* Restart the zoom animation on each navigation */
    lbImg.style.animation = "none";
    void lbImg.offsetWidth;
    lbImg.style.animation = "";
  }

  function openLightbox(index) {
    lastFocused = document.activeElement;
    showImage(index);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    btnClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  const isOpen = () => lightbox.classList.contains("is-open");

  images.forEach((img, i) => {
    img.addEventListener("click", () => openLightbox(i));
  });

  btnPrev.addEventListener("click", () => showImage(currentIndex - 1));
  btnNext.addEventListener("click", () => showImage(currentIndex + 1));
  btnClose.addEventListener("click", closeLightbox);

  /* Click on the dark backdrop (not the image or controls) closes */
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    else if (e.key === "ArrowRight") showImage(currentIndex + 1);
  });

  /* Touch swipe for phones */
  let touchStartX = 0;
  lightbox.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );
  lightbox.addEventListener(
    "touchend",
    (e) => {
      const delta = e.changedTouches[0].screenX - touchStartX;
      if (delta > 50) showImage(currentIndex - 1);
      else if (delta < -50) showImage(currentIndex + 1);
    },
    { passive: true }
  );
})();

/* --- Determine which page we're on and load appropriate data --- */
document.addEventListener("DOMContentLoaded", () => {
  /* Landing page: upcoming events (today or later) */
  if (document.querySelector("#upcoming-events-grid")) {
    loadEvents(
      "data/events.json",
      "#upcoming-events-grid",
      upcomingEvents,
      "No upcoming events on the calendar just yet — but something's always brewing here. Check back soon!"
    );
  }

  /* Archive page: past events */
  if (document.querySelector("#archive-events-grid")) {
    loadEvents(
      "data/events.json",
      "#archive-events-grid",
      pastEvents,
      "No past events to look back on yet — our story is just getting started."
    );
  }
});

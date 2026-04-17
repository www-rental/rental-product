import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- YOUR FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyAQVE7puyekeZd4tKcyAxLNDtLL6DOPApI",
    authDomain: "rent-5d.firebaseapp.com",
    projectId: "rent-5d",
    storageBucket: "rent-5d.firebasestorage.app",
    messagingSenderId: "848398219490",
    appId: "1:848398219490:web:9488a5944ebdc76b8686bb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DATA & STATE ---
export const locationData = { 
    "India": { 
        "Kerala": { "Kasaragod": ["Mangad", "Udma", "Kalanad"] },
        "Karnataka": { "Bangalore": ["Mathikara", "Indiranagar"] }
    }, 
    "USA": { "California": { "Hollywood": ["Second Street", "Sunset Blvd"] } }
};

let state = { step: 'location', item: null, days: 0, total: 0, advance: 0, activeCategory: '' };

// --- CORE UTILS ---
function render(title, content) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-content').innerHTML = content;
}

export function handleBack() {
    if (state.step === 'payment' || state.step === 'kyc') showDetails(state.item);
    else if (state.step === 'details') showItems(state.activeCategory);
    else if (state.step === 'items') showCategories();
    else if (state.step === 'category') {
        document.getElementById('modal-overlay').classList.remove('modal-active');
        setTimeout(() => {
            document.getElementById('modal-overlay').style.display = 'none';
            document.getElementById('main-form').classList.remove('form-hidden');
        }, 300);
    }
}

export function showCategories() {
    state.step = 'category';
    render("Choose Category", "");
    const container = document.getElementById('modal-content');
    ["Car", "Bike", "Camera"].forEach(cat => {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.innerHTML = `<strong>${cat}</strong> <span>➔</span>`;
        div.onclick = () => showItems(cat);
        container.appendChild(div);
    });
}

async function showItems(category) {
    state.step = 'items';
    state.activeCategory = category;
    
    const selectedPlace = document.getElementById('place').value;
    
    render(`${category}s in ${selectedPlace}`, `<div class="loading-spinner"></div>`);

    try {
        // Updated Query:
        // We reach into 'location.place' for the search
        const q = query(
            collection(db, "vehicles"), 
            where("location.place", "==", selectedPlace)
        );

        const snap = await getDocs(q);
        const container = document.getElementById('modal-content');
        container.innerHTML = "";

        // Filter the results in JavaScript based on the category chosen
        const filteredDocs = snap.docs.filter(doc => {
            const data = doc.data();
            if (category === "Car") return data.carDetails; // Only show if it has carDetails
            if (category === "Bike") return data.bikeDetails; // (If you use bikeDetails for bikes)
            return true;
        });

        if (filteredDocs.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:20px;">No ${category}s found in ${selectedPlace}.</p>`;
            return;
        }

        filteredDocs.forEach(doc => {
            const data = doc.data();
            const vehicleName = data.carDetails?.name || "Suzuki Dezire";
            const price = data.price || "Contact for Price";
            
            const div = document.createElement('div');
            div.className = 'item-card';
            div.innerHTML = `
                <div>
                    <strong>${vehicleName}</strong><br>
                    <small>${data.carDetails?.transmission || ''} | ${data.carDetails?.fuel || ''}</small>
                </div>
                <span style="font-weight:700; color:var(--success)">➔</span>`;
            
            div.onclick = () => showDetails({ id: doc.id, ...data });
            container.appendChild(div);
        });
    } catch (e) {
        console.error("Query Error:", e);
        render("Error", "Could not load data. Check console.");
    }
}
function showDetails(item) {
    state.item = item;
    state.step = 'details';

    // Reach into the nested maps from your screenshot
    const name = item.carDetails?.name || "Vehicle";
    const model = item.carDetails?.model || "";
    const fuel = item.carDetails?.fuel || "";
    const trans = item.carDetails?.transmission || "";
    
    // Get location details
    const placeName = item.location?.place || "Unknown Place";
    const district = item.location?.district || "";
    
    
    // Get owner info
    const owner = item.location?.ownerName || "";
    const price = item.price?.pricePerDay || "Contact for Price";
    const phone = item.location?.phone || item.phone || "No Number";

    render("Item Details", `
        <div style="padding:10px;">
            <h2 style="margin-bottom:5px;">${name}</h2>
            <p style="color:#666; margin-top:0;">${model} | ${fuel} | ${trans}</p>
            
            <p style="color:#444;">
                <strong>Location:</strong> ${placeName}, ${district}, ${item.location?.state || ''}, ${item.location?.country || ''}
            </p>

            <div style="background:#f1f4f8; padding:15px; border-radius:12px; margin-top:15px;">
                <p style="margin:0;"><strong>Owner:</strong> ${item.ownerName}</p>
                <p style="margin:5px 0 0 0;"><strong>Price/Day:</strong> ₹${item.pricePerDay}</p>
                <p style="margin:5px 0 0 0;"><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
            </div>

            <button class="book-btn success-btn" style="margin-top:20px;" onclick="showBookingFlow()">
                Proceed to Book
            </button>
        </div>
    `);
}

export function showBookingFlow() {
    state.step = 'kyc';
    const today = new Date().toISOString().split('T')[0];
    const country = document.getElementById('country').value;

    // Define License Placeholder based on Country
    let licensePlaceholder = "Enter License Number";
    if (country === "India") licensePlaceholder = "e.g. KL14 20260001234";
    else if (country === "USA") licensePlaceholder = "e.g. 123-456-789";

    render("Booking & KYC", `
        <div style="text-align: left; padding: 5px;">
            <p style="font-size: 0.8rem; color: #666; margin-bottom: 15px;">Fill in your details to finalize the booking for <strong>${state.item.carDetails?.name || 'Vehicle'}</strong>.</p>
            
            <label>Customer Photo</label>
            <input type="file" id="custPhoto" accept="image/*" style="margin-bottom:15px">

            <label>Full Name</label>
            <input type="text" id="custName" placeholder="Enter your full name" style="margin-bottom:15px">

            <label>Address</label>
            <textarea id="custAddress" placeholder="Enter complete address" rows="2" style="margin-bottom:15px; width:100%; border-radius:8px; border:1px solid #ccc; padding:10px;"></textarea>

            <label>Phone Number</label>
            <input type="tel" id="custPhone" placeholder="Phone number" style="margin-bottom:15px">

            <div style="background: #f1f1f1; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                <label>Driving License (${country})</label>
                <input type="text" id="licenseNum" placeholder="${licensePlaceholder}" style="margin-bottom:10px">
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <small>Front Photo</small>
                        <input type="file" id="dlFront" accept="image/*">
                    </div>
                    <div>
                        <small>Back Photo</small>
                        <input type="file" id="dlBack" accept="image/*">
                    </div>
                </div>
            </div>

            <label>Signature Photo</label>
            <input type="file" id="custSign" accept="image/*" style="margin-bottom:15px">

            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 15px;">
                <div><label>From Date</label><input type="date" id="fromDate" min="${today}" onchange="updateLiveTotal()"></div>
                <div><label>To Date</label><input type="date" id="toDate" min="${today}" onchange="updateLiveTotal()"></div>
            </div>

            <div id="price-summary" style="margin-bottom: 15px; display:none;"></div>

            <button class="book-btn success-btn" onclick="generateBill()">
                Confirm & Pay Advance
            </button>
        </div>
    `);
}

export function updateLiveTotal() {
    const fromVal = document.getElementById('fromDate').value;
    const toVal = document.getElementById('toDate').value;
    
    // Check all possible locations for the price in your dataset
    const pricePerDay = parseFloat(
        state.item.price || 
        state.item.carDetails?.price || 
        state.item.pricePerDay || 0
    );

    if (fromVal && toVal && pricePerDay > 0) {
        const from = new Date(fromVal);
        const to = new Date(toVal);
        
        if (to >= from) {
            const diffTime = Math.abs(to - from);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            // Discount Logic
            let discPercent = 0;
            if (diffDays >= 30) discPercent = 50;
            else if (diffDays >= 15) discPercent = 35;
            else if (diffDays >= 7) discPercent = 25;
            else if (diffDays >= 2) discPercent = 5;

            // Math: Total = (Price * Days) - Discount
            const baseRent = pricePerDay * diffDays;
            const discountAmount = Math.round(baseRent * (discPercent / 100));
            const finalTotal = baseRent - discountAmount;

            // Save to state for the database
            state.total = finalTotal;
            state.days = diffDays;
            state.advance = Math.round(finalTotal * 0.30); // 30% Advance

            // Update UI
            const box = document.getElementById('price-summary');
            box.style.display = 'block';
            box.innerHTML = `
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; color: #666;">
                        <span>Rental (${diffDays} days)</span>
                        <span>₹${baseRent}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #d32f2f; margin: 5px 0;">
                        <span>Discount (${discPercent}%)</span>
                        <span>- ₹${discountAmount}</span>
                    </div>
                </div>
                <div style="padding: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 1.1rem;">Total Amount:</span>
                        <span style="font-weight: 800; font-size: 1.5rem; color: #1b5e20;">₹${finalTotal}</span>
                    </div>
                    <div style="margin-top: 10px; padding: 12px; background: #e8f5e9; border-radius: 8px; text-align: center;">
                        <span style="color: #2e7d32; font-weight: bold; font-size: 1.1rem;">
                            Advance to Pay: ₹${state.advance}
                        </span>
                    </div>
                </div>
            `;
        }
    } else if (pricePerDay === 0) {
        console.error("Price not found in state.item:", state.item);
    }
}

export function generateBill() {
    if (!state.total) return alert("Please select dates first!");

    // 1. Get Customer details from the form inputs
    const custName = document.getElementById('custName')?.value || "N/A";
    const custPhone = document.getElementById('custPhone')?.value || "N/A";
    const license = document.getElementById('licenseNum')?.value || "N/A";

    // 2. Get Owner/Vehicle details strictly from your Firestore dataset
    // In your dataset, 'name' is top-level, and owner details are in 'location'
    const vehicleName = state.item.name || "Vehicle"; // Matches "suzuki dezir"
    const ownerName = state.item.location?.ownerName || "owner"; // Matches "mohammed fahad f m"
    const ownerPhone = state.item.location?.phone || "phone"; // Matches "+91 8547780991"
    const locationPlace = state.item.location?.place || ""; // Matches "Mangad"
    
    state.step = 'payment';

    render("Final Booking Summary", `
        <div style="text-align: left; font-family: sans-serif;">
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #2e7d32; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #2e7d32;">Owner Details</h4>
                <p style="margin: 3px 0;"><strong>Owner:</strong> ${ownerName}</p>
                <p style="margin: 3px 0;"><strong>Vehicle:</strong> ${vehicleName}</p>
                <p style="margin: 3px 0;"><strong>Contact:</strong> ${ownerPhone}</p>
                <p style="margin: 3px 0;"><strong>Location:</strong> ${locationPlace}</p>
            </div>

            <div style="background: #fff; padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: var(--primary);">Customer Details</h4>
                <p style="margin: 3px 0;"><strong>Name:</strong> ${custName}</p>
                <p style="margin: 3px 0;"><strong>Phone:</strong> ${custPhone}</p>
                <p style="margin: 3px 0;"><strong>DL No:</strong> ${license}</p>
                <p style="margin: 3px 0;"><strong>Period:</strong> ${document.getElementById('fromDate').value} to ${document.getElementById('toDate').value}</p>
            </div>

            <div style="border-top: 2px dashed #ccc; padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>Total Rental (${state.days} Days):</span>
                    <span>₹${state.total}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.2rem; color: #2e7d32; margin-top: 10px;">
                    <span>Advance Payable:</span>
                    <span>₹${state.advance}</span>
                </div>
            </div>

            <p style="font-size: 0.75rem; color: #888; margin-top: 15px; text-align: center;">
                By clicking pay, you agree to the rental terms and conditions.
            </p>

            <button class="book-btn success-btn" style="margin-top: 15px;" onclick="verifyPayment()">
                Pay Advance ₹${state.advance}
            </button>
        </div>
    `);
}
export async function verifyPayment() {
    const name = document.getElementById('custName')?.value || "Guest";
    render("Processing...", "<div class='loading-spinner'></div>");
    
    try {
        await addDoc(collection(db, "bookings"), {
            customer: name,
            item: state.item.name,
            total: state.total,
            advancePaid: state.advance,
            timestamp: serverTimestamp()
        });
        render("Booking Confirmed ✅", `<h3>Thank you, ${name}!</h3><p>Show this to the owner for pickup.</p><button class="book-btn" onclick="location.reload()">Done</button>`);
    } catch (e) { render("Error", "Could not save booking."); }
}
// Paste this at the absolute end of script.js
window.showBookingFlow = showBookingFlow;
window.generateBill = generateBill;
window.updateLiveTotal = updateLiveTotal;
window.verifyPayment = verifyPayment;
window.handleBack = handleBack;

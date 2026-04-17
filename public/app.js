/* ============================================
   ADVANCED SCHEMA MARKUP GENERATOR V2
   Complete JavaScript Engine
   ============================================ */

// ── State ──────────────────────────────────
let locationCounter = 0, serviceCounter = 0, faqCounter = 0;
let debounceTimer = null;
let appStats = { schemas: 0, audits: 0, scores: [], entities: 0, lastUsed: 'unknown' };
let graphData = { nodes: [], links: [] };
let graphLayout = 'force';
let graphSimulation = null;

// ── Init ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    addLocation();
    addService();
    addFAQ();
    liveGenerate();
    updateCurrentDate();
    updateNavActive('dashboard');
    setupEnterKeyHandlers();
    initGraphResize();
});

// Enter key support for URL inputs
function setupEnterKeyHandlers() {
    const urlInputs = [
        { id: 'autodetect-url', handler: autoDetect },
        { id: 'audit-url', handler: auditURL },
        { id: 'graph-url', handler: visualizeURL }
    ];
    urlInputs.forEach(({ id, handler }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handler();
                }
            });
        }
    });
}

// ═══════════════════════════════════════════
//  VIEW MANAGEMENT
// ═══════════════════════════════════════════
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + viewId).classList.add('active');
    updateNavActive(viewId);
    if (viewId === 'wizard') liveGenerate();
    if (viewId === 'dashboard') updateDashboardStats();
}

// Update current date in navbar
function updateCurrentDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Update sidebar nav active state
function updateNavActive(viewId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewId) {
            item.classList.add('active');
        }
    });
}

// ═══════════════════════════════════════════
//  DASHBOARD STATS
// ═══════════════════════════════════════════
function loadStats() {
    try {
        const s = localStorage.getItem('schemaGenStats');
        if (s) appStats = JSON.parse(s);
    } catch(e) {}
    updateDashboardStats();
}
function saveStats() {
    try { localStorage.setItem('schemaGenStats', JSON.stringify(appStats)); } catch(e) {}
}
function updateDashboardStats() {
    const schemasEl = document.getElementById('stat-schemas');
    const auditsEl = document.getElementById('stat-audits');
    const avgEl = document.getElementById('stat-avg');
    const entitiesEl = document.getElementById('stat-entities');
    const mostUsedEl = document.getElementById('stat-mostused');
    
    if (schemasEl) schemasEl.textContent = appStats.schemas;
    if (auditsEl) auditsEl.textContent = appStats.audits;
    
    const avg = appStats.scores.length > 0 ? Math.round(appStats.scores.reduce((a,b)=>a+b,0)/appStats.scores.length) : '--';
    if (avgEl) avgEl.textContent = avg;
    
    if (entitiesEl) entitiesEl.textContent = appStats.entities;
    if (mostUsedEl) mostUsedEl.textContent = appStats.lastUsed || '--';
}

// ═══════════════════════════════════════════
//  COMMON UTILITIES
// ═══════════════════════════════════════════
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function showToast(msg, type='info') {
    const container = document.getElementById('toast-container');
    if (!container) { console.warn('Toast container not found'); return; }
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = `<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span> ${msg}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
function toggleCard(id) { document.getElementById(id).classList.toggle('collapsed'); }

// Tags
function handleTagInput(e, cid) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const v = e.target.value.trim(); if (!v) return;
        const c = document.getElementById(cid);
        if (!c) return;
        const tag = document.createElement('span'); tag.className = 'tag';
        tag.innerHTML = `${escapeHtml(v)} <span class="remove-tag" onclick="this.parentElement.remove();liveGenerate()">×</span>`;
        tag.dataset.value = v;
        c.insertBefore(tag, e.target); e.target.value = ''; liveGenerate();
    }
}
function getTagValues(cid) {
    const c = document.getElementById(cid); if (!c) return [];
    return Array.from(c.querySelectorAll('.tag')).map(t => t.dataset.value).filter(Boolean);
}

// ═══════════════════════════════════════════
//  DYNAMIC FORM SECTIONS
// ═══════════════════════════════════════════
function addLocation() {
    const container = document.getElementById('locations-list');
    if (!container) return;
    locationCounter++;
    const n = locationCounter;
    container.insertAdjacentHTML('beforeend', `
    <div class="repeater-entry" id="loc-${n}">
        <div class="repeater-entry-header">
            <span class="repeater-entry-title"><span class="entry-number">${n}</span> Location #${n}</span>
            <button class="btn btn-danger btn-sm" onclick="removeEntry('loc-${n}')">✕ Remove</button>
        </div>
        <div class="form-row"><div class="form-group"><label>Branch Name <span class="required">*</span></label><input type="text" id="loc-name-${n}" placeholder="e.g., Acme Medical – Downtown" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Location Type</label><select id="loc-type-${n}" onchange="liveGenerate()"><option value="">Same as Parent</option><option value="LocalBusiness">LocalBusiness</option><option value="MedicalClinic">MedicalClinic</option><option value="Dentist">Dentist</option><option value="Hospital">Hospital</option><option value="Pharmacy">Pharmacy</option><option value="LegalService">LegalService</option><option value="Restaurant">Restaurant</option><option value="BeautySalon">BeautySalon</option><option value="Store">Store</option><option value="ProfessionalService">ProfessionalService</option><option value="AutoRepair">AutoRepair</option></select></div></div>
        <div class="form-group"><label>Location Page URL</label><input type="url" id="loc-url-${n}" placeholder="https://www.example.com/locations/downtown" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Street Address <span class="required">*</span></label><input type="text" id="loc-street-${n}" placeholder="123 Main St, Suite 100" oninput="liveGenerate()"></div>
        <div class="form-row-3"><div class="form-group"><label>City <span class="required">*</span></label><input type="text" id="loc-city-${n}" placeholder="Los Angeles" oninput="liveGenerate()"></div>
        <div class="form-group"><label>State <span class="required">*</span></label><input type="text" id="loc-state-${n}" placeholder="CA" oninput="liveGenerate()"></div>
        <div class="form-group"><label>ZIP <span class="required">*</span></label><input type="text" id="loc-zip-${n}" placeholder="90001" oninput="liveGenerate()"></div></div>
        <div class="form-row"><div class="form-group"><label>Country</label><input type="text" id="loc-country-${n}" value="US" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Phone</label><input type="tel" id="loc-phone-${n}" placeholder="+1-555-123-4567" oninput="liveGenerate()"></div></div>
        <div class="form-row"><div class="form-group"><label>Email</label><input type="email" id="loc-email-${n}" placeholder="info@example.com" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Google Maps URL</label><input type="url" id="loc-map-${n}" placeholder="https://maps.google.com/..." oninput="liveGenerate()"></div></div>
        <div class="form-row"><div class="form-group"><label>Latitude</label><input type="text" id="loc-lat-${n}" placeholder="34.0522" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Longitude</label><input type="text" id="loc-lng-${n}" placeholder="-118.2437" oninput="liveGenerate()"></div></div>
        <div class="form-group"><label>Opening Hours <span class="hint">(e.g., Mo-Fr 09:00-17:00)</span></label><input type="text" id="loc-hours-${n}" placeholder="Mo-Fr 09:00-17:00, Sa 10:00-14:00" oninput="liveGenerate()"></div>
        <div class="form-row"><div class="form-group"><label>Price Range</label><input type="text" id="loc-price-${n}" placeholder="$$" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Payment Accepted</label><input type="text" id="loc-payment-${n}" placeholder="Cash, Credit Card" oninput="liveGenerate()"></div></div>
    </div>`);
    liveGenerate();
}

function addService() {
    const container = document.getElementById('services-list');
    if (!container) return;
    serviceCounter++;
    const n = serviceCounter;
    container.insertAdjacentHTML('beforeend', `
    <div class="repeater-entry" id="svc-${n}">
        <div class="repeater-entry-header">
            <span class="repeater-entry-title"><span class="entry-number">${n}</span> Service #${n}</span>
            <button class="btn btn-danger btn-sm" onclick="removeEntry('svc-${n}')">✕ Remove</button>
        </div>
        <div class="form-row"><div class="form-group"><label>Service Name <span class="required">*</span></label><input type="text" id="svc-name-${n}" placeholder="e.g., Plastic Surgery" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Service Type</label><select id="svc-type-${n}" onchange="liveGenerate()"><option value="Service">Service</option><option value="MedicalProcedure">MedicalProcedure</option><option value="LegalService">LegalService</option><option value="FinancialProduct">FinancialProduct</option><option value="ProfessionalService">ProfessionalService</option></select></div></div>
        <div class="form-group"><label>Service URL</label><input type="url" id="svc-url-${n}" placeholder="https://www.example.com/services/..." oninput="liveGenerate()"></div>
        <div class="form-group"><label>Description</label><textarea id="svc-desc-${n}" rows="2" placeholder="Brief description..." oninput="liveGenerate()"></textarea></div>
        <div class="form-group"><label>Area Served <span class="hint">(press Enter to add)</span></label>
        <div class="tags-container" id="svc-areas-${n}" onclick="this.querySelector('input').focus()"><input type="text" placeholder="e.g., Los Angeles, CA" onkeydown="handleTagInput(event,'svc-areas-${n}')"></div></div>
        <div class="form-row"><div class="form-group"><label>Provider Name</label><input type="text" id="svc-provider-${n}" placeholder="Dr. John Smith" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Price Range</label><input type="text" id="svc-price-${n}" placeholder="$500 - $5000" oninput="liveGenerate()"></div></div>
    </div>`);
    liveGenerate();
}

function addFAQ() {
    const container = document.getElementById('faq-list');
    if (!container) return;
    faqCounter++;
    const n = faqCounter;
    container.insertAdjacentHTML('beforeend', `
    <div class="repeater-entry" id="faq-${n}">
        <div class="repeater-entry-header">
            <span class="repeater-entry-title"><span class="entry-number">${n}</span> FAQ #${n}</span>
            <button class="btn btn-danger btn-sm" onclick="removeEntry('faq-${n}')">✕ Remove</button>
        </div>
        <div class="form-group"><label>Question <span class="required">*</span></label><input type="text" id="faq-q-${n}" placeholder="e.g., What are your office hours?" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Answer <span class="required">*</span></label><textarea id="faq-a-${n}" rows="3" placeholder="Provide a complete answer..." oninput="liveGenerate()"></textarea></div>
    </div>`);
    liveGenerate();
}

// Person/Founder counter
let personCounter = 0;
function addPerson() {
    const container = document.getElementById('people-list');
    if (!container) return;
    personCounter++;
    const n = personCounter;
    container.insertAdjacentHTML('beforeend', `
    <div class="repeater-entry" id="person-${n}">
        <div class="repeater-entry-header">
            <span class="repeater-entry-title"><span class="entry-number">${n}</span> Person #${n}</span>
            <button class="btn btn-danger btn-sm" onclick="removeEntry('person-${n}')">✕ Remove</button>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Full Name <span class="required">*</span></label><input type="text" id="person-name-${n}" placeholder="Dr. John Smith" oninput="liveGenerate()"></div>
            <div class="form-group"><label>Role/Title</label><input type="text" id="person-role-${n}" placeholder="Founder, CEO, Attorney" oninput="liveGenerate()"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Job Title</label><input type="text" id="person-jobtitle-${n}" placeholder="Chief Executive Officer" oninput="liveGenerate()"></div>
            <div class="form-group"><label>Email</label><input type="email" id="person-email-${n}" placeholder="john@example.com" oninput="liveGenerate()"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Wikipedia URL</label><input type="url" id="person-wiki-${n}" placeholder="https://en.wikipedia.org/wiki/..." oninput="liveGenerate()"></div>
            <div class="form-group"><label>Wikidata QID</label><input type="text" id="person-wikidata-${n}" placeholder="Q123456" oninput="liveGenerate()"></div>
        </div>
        <div class="form-group"><label>Education / Credentials</label><input type="text" id="person-education-${n}" placeholder="Harvard Law School, JD" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Awards & Accolades <span class="hint">(comma separated)</span></label><input type="text" id="person-awards-${n}" placeholder="Best Lawyer 2023, Super Lawyers" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Professional Affiliations <span class="hint">(comma separated)</span></label><input type="text" id="person-affiliations-${n}" placeholder="American Bar Association, State Bar" oninput="liveGenerate()"></div>
        <div class="form-group"><label>sameAs Links <span class="hint">(LinkedIn, Twitter, etc - press Enter)</span></label>
        <div class="tags-container" id="person-sameas-${n}" onclick="this.querySelector('input').focus()"><input type="text" placeholder="Paste profile URLs..." onkeydown="handleTagInput(event,'person-sameas-${n}')"></div></div>
    </div>`);
    liveGenerate();
}

// Landmark counter
let landmarkCounter = 0;
function addLandmark() {
    const container = document.getElementById('landmarks-list');
    if (!container) return;
    landmarkCounter++;
    const n = landmarkCounter;
    container.insertAdjacentHTML('beforeend', `
    <div class="repeater-entry" id="landmark-${n}">
        <div class="repeater-entry-header">
            <span class="repeater-entry-title"><span class="entry-number">${n}</span> Landmark #${n}</span>
            <button class="btn btn-danger btn-sm" onclick="removeEntry('landmark-${n}')">✕ Remove</button>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Place Name <span class="required">*</span></label><input type="text" id="landmark-name-${n}" placeholder="Sky Harbor Airport" oninput="liveGenerate()"></div>
            <div class="form-group"><label>Place Type</label><select id="landmark-type-${n}" onchange="liveGenerate()">
                <option value="LandmarksOrHistoricalBuildings">Landmark</option>
                <option value="Airport">Airport</option>
                <option value="StadiumOrArena">Stadium/Arena</option>
                <option value="Museum">Museum</option>
                <option value="Park">Park</option>
                <option value="TouristAttraction">Tourist Attraction</option>
                <option value="LocalBusiness">Local Business</option>
                <option value="CivicStructure">Civic Structure</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Latitude</label><input type="text" id="landmark-lat-${n}" placeholder="33.4373" oninput="liveGenerate()"></div>
            <div class="form-group"><label>Longitude</label><input type="text" id="landmark-lng-${n}" placeholder="-112.0078" oninput="liveGenerate()"></div>
        </div>
        <div class="form-group"><label>Relationship to Business</label><input type="text" id="landmark-relation-${n}" placeholder="Clients fly in via this airport to visit us" oninput="liveGenerate()"></div>
        <div class="form-group"><label>Wikipedia URL (optional)</label><input type="url" id="landmark-wiki-${n}" placeholder="https://en.wikipedia.org/wiki/..." oninput="liveGenerate()"></div>
    </div>`);
    liveGenerate();
}

// Offer/Service counter
let offerCounter = 0;
function addOffer() {
    const container = document.getElementById('offers-list');
    if (!container) return;
    offerCounter++;
    const n = offerCounter;
    container.insertAdjacentHTML('beforeend', `
    <div class="repeater-entry" id="offer-${n}">
        <div class="repeater-entry-header">
            <span class="repeater-entry-title"><span class="entry-number">${n}</span> Offer #${n}</span>
            <button class="btn btn-danger btn-sm" onclick="removeEntry('offer-${n}')">✕ Remove</button>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Service/Item Name <span class="required">*</span></label><input type="text" id="offer-name-${n}" placeholder="SEO Consulting" oninput="liveGenerate()"></div>
            <div class="form-group"><label>Category</label><input type="text" id="offer-category-${n}" placeholder="Digital Marketing" oninput="liveGenerate()"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Price</label><input type="text" id="offer-price-${n}" placeholder="$500" oninput="liveGenerate()"></div>
            <div class="form-group"><label>Price Currency</label><select id="offer-currency-${n}" onchange="liveGenerate()">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
            </select></div>
        </div>
        <div class="form-group"><label>Description</label><textarea id="offer-desc-${n}" rows="2" placeholder="Brief description of the service..." oninput="liveGenerate()"></textarea></div>
        <div class="form-group"><label>URL</label><input type="url" id="offer-url-${n}" placeholder="https://example.com/services/seo" oninput="liveGenerate()"></div>
    </div>`);
    liveGenerate();
}

function removeEntry(id) {
    const el = document.getElementById(id);
    if (el) { el.style.opacity='0'; el.style.transform='translateX(-20px)'; el.style.transition='all 0.2s'; setTimeout(()=>{el.remove();liveGenerate()},200); }
}

// ═══════════════════════════════════════════
//  JSON-LD SCHEMA BUILDER (WIZARD)
// ═══════════════════════════════════════════
function liveGenerate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const schema = buildSchema();
        renderOutput(schema);
        updateWizardStats(schema);
    }, 150);
}

function generateSchema() {
    const schema = buildSchema();
    renderOutput(schema);
    validateSchema();
    updateWizardStats(schema);
    appStats.schemas++;
    appStats.lastUsed = 'Wizard';
    appStats.entities += (schema['@graph'] || []).length;
    saveStats();
    showToast('Schema generated successfully!', 'success');
}

function buildSchema() {
    const graph = [];
    const baseUrl = val('entity-url') || 'https://www.example.com';
    const orgId = baseUrl.replace(/\/+$|\/+/g,'') + '/#organization';

    // Organization — Note: mainEntityOfPage is NOT added to Organization entities.
    // It belongs only on content entities (Article, BlogPosting, Product, etc.) pointing to their canonical page URL.
    const org = {"@type": val('entity-type')||'Organization', "@id": orgId, "name": val('entity-name')||undefined, "url": baseUrl||undefined };
    if (val('entity-legal-name')) org.legalName = val('entity-legal-name');
    if (val('entity-description')) org.description = val('entity-description');
    if (val('entity-logo')) org.logo = {"@type":"ImageObject","@id":baseUrl.replace(/\/+$|\/+/g,'')+'/#logo',"url":val('entity-logo'),"contentUrl":val('entity-logo'),"caption":(val('entity-name')||'')+" Logo"};
    if (val('entity-image')) org.image = val('entity-image');
    if (val('entity-founded')) org.foundingDate = val('entity-founded');
    if (val('entity-employees')) org.numberOfEmployees = {"@type":"QuantitativeValue","value":val('entity-employees')};

    // sameAs - Enhanced with new citation fields
    const sameAs = [];
    ['social-facebook','social-instagram','social-linkedin','social-twitter','social-youtube','social-tiktok','dir-google','dir-apple','dir-yelp','dir-bbb'].forEach(id => { if(val(id)) sameAs.push(val(id)); });
    sameAs.push(...getTagValues('sameAs-tags'));
    // New sameAs fields from advanced section
    if (val('gmb-url')) sameAs.push(val('gmb-url'));
    if (val('facebook-url')) sameAs.push(val('facebook-url'));
    if (val('linkedin-url')) sameAs.push(val('linkedin-url'));
    if (val('twitter-url')) sameAs.push(val('twitter-url'));
    if (val('youtube-url')) sameAs.push(val('youtube-url'));
    // Additional sameAs tags from citations section
    sameAs.push(...getTagValues('sameas-tags'));
    sameAs.push(...getTagValues('sameas-tags-2'));
    if (val('entity-wikipedia')) sameAs.push(val('entity-wikipedia'));
    if (val('entity-wikidata')) sameAs.push('https://www.wikidata.org/wiki/'+val('entity-wikidata'));
    if (val('wiki-url')) sameAs.push(val('wiki-url'));
    if (sameAs.length) org.sameAs = [...new Set(sameAs)]; // Remove duplicates

    // knowsAbout - Entity topics
    const knowsAbout = getTagValues('knowsabout-tags');
    if (val('wiki-url')) {
        knowsAbout.push({"@type":"Thing","name":val('wiki-url').split('/').pop().replace(/_/g,' '),"sameAs":val('wiki-url')});
    }
    if (val('wikidata-qid')) {
        knowsAbout.push({"@type":"Thing","@id":"https://www.wikidata.org/wiki/"+val('wikidata-qid')});
    }
    // Also check the second set of wiki fields (from Entity Topics section)
    if (val('wiki-url-2')) {
        knowsAbout.push({"@type":"Thing","name":val('wiki-url-2').split('/').pop().replace(/_/g,' '),"sameAs":val('wiki-url-2')});
    }
    if (val('wikidata-qid-2')) {
        knowsAbout.push({"@type":"Thing","@id":"https://www.wikidata.org/wiki/"+val('wikidata-qid-2')});
    }
    if (knowsAbout.length) org.knowsAbout = knowsAbout;

    // Aggregate Rating
    const reviewsEnabled = document.getElementById('reviews-enabled');
    if (reviewsEnabled && reviewsEnabled.checked && val('review-value') && val('review-count')) {
        org.aggregateRating = {"@type":"AggregateRating","ratingValue":parseFloat(val('review-value')),"bestRating":parseFloat(val('review-best')||'5'),"reviewCount":parseInt(val('review-count'))};
        if (val('rating-count')) org.aggregateRating.ratingCount = parseInt(val('rating-count'));
    }

    // Contact
    if (val('loc-phone-1')||val('loc-email-1')) { org.contactPoint = {"@type":"ContactPoint","contactType":"customer service"}; if(val('loc-phone-1'))org.contactPoint.telephone=val('loc-phone-1'); if(val('loc-email-1'))org.contactPoint.email=val('loc-email-1'); }

    // Area Served with Geo Circle
    if (val('area-city') || val('area-state')) {
        const areaServed = {"@type":"City"};
        if (val('area-city')) areaServed.name = val('area-city');
        if (val('area-state')) areaServed.containedInPlace = {"@type":"State","name":val('area-state')};
        
        // Geo Circle for service radius (advanced technique)
        if (val('geo-lat') && val('geo-lng') && val('geo-radius')) {
            areaServed.geo = {
                "@type":"GeoCircle",
                "geoMidpoint":{"@type":"GeoCoordinates","latitude":parseFloat(val('geo-lat')),"longitude":parseFloat(val('geo-lng'))},
                "geoRadius":parseFloat(val('geo-radius')) * 1609.34
            };
        }
        org.areaServed = [areaServed];
        
        // Additional service areas
        const serviceAreas = getTagValues('service-areas-tags');
        serviceAreas.forEach(sa => {
            org.areaServed.push({"@type":"City","name":sa});
        });
    }

    // potentialAction - CTAs
    if (val('action-type') && val('action-target')) {
        const actionType = val('action-type');
        if (actionType === 'ContactPage') {
            org.potentialAction = {
                "@type":"CommunicateAction",
                "target":{"@type":"EntryPoint","urlTemplate":val('action-target'),"actionPlatform":["http://schema.org/DesktopWebPlatform","http://schema.org/MobileWebPlatform"]},
                "name":"Contact Us"
            };
        } else if (actionType === 'PhoneAction') {
            org.potentialAction = {
                "@type":"CommunicateAction",
                "target":{"@type":"EntryPoint","urlTemplate":"tel:"+val('action-target').replace(/[^0-9+]/g,'')},
                "name":"Call Us"
            };
        } else if (actionType === 'ReserveAction') {
            org.potentialAction = {
                "@type":"ReserveAction",
                "target":{"@type":"EntryPoint","urlTemplate":val('action-target'),"actionPlatform":["http://schema.org/DesktopWebPlatform","http://schema.org/MobileWebPlatform"]},
                "name":"Make a Reservation"
            };
        } else if (actionType === 'BuyAction' || actionType === 'OrderAction') {
            org.potentialAction = {
                "@type":"BuyAction",
                "target":{"@type":"EntryPoint","urlTemplate":val('action-target'),"actionPlatform":["http://schema.org/DesktopWebPlatform","http://schema.org/MobileWebPlatform"]},
                "name":"Order Now"
            };
        }
    }

    graph.push(org);

    // People/Founders - key recommendation for E-E-A-T
    const people = [];
    document.querySelectorAll('#people-list .repeater-entry').forEach(entry => {
        const n = entry.id.replace('person-','');
        if (!val('person-name-'+n)) return;
        const personId = baseUrl.replace(/\/+$|\/+/g,'')+'/#person-'+n;
        const person = {
            "@type":"Person",
            "@id":personId,
            "name":val('person-name-'+n)
        };
        if (val('person-role-'+n)) person.jobTitle = val('person-role-'+n);
        if (val('person-jobtitle-'+n)) person.jobTitle = val('person-jobtitle-'+n);
        if (val('person-email-'+n)) person.email = val('person-email-'+n);
        if (val('person-wiki-'+n)) person.sameAs = [val('person-wiki-'+n)];
        if (val('person-wikidata-'+n)) {
            if (!person.sameAs) person.sameAs = [];
            person.sameAs.push('https://www.wikidata.org/wiki/'+val('person-wikidata-'+n));
        }
        if (val('person-education-'+n)) {
            person.alumniOf = {"@type":"EducationalOrganization","name":val('person-education-'+n)};
        }
        if (val('person-awards-'+n)) {
            person.award = val('person-awards-'+n).split(',').map(a => a.trim());
        }
        if (val('person-affiliations-'+n)) {
            person.affiliation = val('person-affiliations-'+n).split(',').map(a => ({"@type":"Organization","name":a.trim()}));
        }
        const personSameAs = getTagValues('person-sameas-'+n);
        if (personSameAs.length) {
            if (!person.sameAs) person.sameAs = [];
            person.sameAs.push(...personSameAs);
        }
        
        // Determine if founder or employee
        const role = (val('person-role-'+n) || '').toLowerCase();
        if (role.includes('founder') || role.includes('owner') || role.includes('partner')) {
            people.push({"@id":personId,"role":"founder"});
        } else {
            people.push({"@id":personId,"role":"employee"});
        }
        graph.push(person);
    });
    
    // Add founders and employees to org
    const founders = people.filter(p => p.role === 'founder').map(p => ({"@id":p["@id"]}));
    const employees = people.filter(p => p.role === 'employee').map(p => ({"@id":p["@id"]}));
    if (founders.length) org.founder = founders.length === 1 ? founders[0] : founders;
    if (employees.length) org.employee = employees;

    // WebSite
    graph.push({"@type":"WebSite","@id":baseUrl.replace(/\/+$|\/+/g,'')+'/#website',"name":val('entity-name')||undefined,"url":baseUrl||undefined,"publisher":{"@id":orgId}});

    // Locations
    const subOrgs = [];
    document.querySelectorAll('#locations-repeater .repeater-entry').forEach(entry => {
        const n = entry.id.replace('loc-','');
        if (!val('loc-name-'+n)) return;
        const slug = val('loc-name-'+n).toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const locId = baseUrl.replace(/\/+$|\/+/g,'')+'/#location-'+slug;
        subOrgs.push({"@id":locId});
        const loc = {"@type":val('loc-type-'+n)||val('entity-type')||'LocalBusiness',"@id":locId,"name":val('loc-name-'+n),"parentOrganization":{"@id":orgId}};
        if(val('loc-url-'+n)){loc.url=val('loc-url-'+n);loc.mainEntityOfPage={"@type":"WebPage","@id":val('loc-url-'+n)};}
        const addr = {}; if(val('loc-street-'+n))addr.streetAddress=val('loc-street-'+n); if(val('loc-city-'+n))addr.addressLocality=val('loc-city-'+n); if(val('loc-state-'+n))addr.addressRegion=val('loc-state-'+n); if(val('loc-zip-'+n))addr.postalCode=val('loc-zip-'+n); if(val('loc-country-'+n))addr.addressCountry=val('loc-country-'+n);
        if(Object.keys(addr).length)loc.address=Object.assign({"@type":"PostalAddress"},addr);
        if(val('loc-lat-'+n)&&val('loc-lng-'+n))loc.geo={"@type":"GeoCoordinates","latitude":parseFloat(val('loc-lat-'+n)),"longitude":parseFloat(val('loc-lng-'+n))};
        if(val('loc-phone-'+n))loc.telephone=val('loc-phone-'+n); if(val('loc-email-'+n))loc.email=val('loc-email-'+n);
        if(val('loc-map-'+n))loc.hasMap=val('loc-map-'+n); if(val('loc-price-'+n))loc.priceRange=val('loc-price-'+n); if(val('loc-payment-'+n))loc.paymentAccepted=val('loc-payment-'+n);
        if(val('loc-hours-'+n))loc.openingHoursSpecification=parseHours(val('loc-hours-'+n));
        if(val('entity-logo'))loc.logo={"@id":baseUrl.replace(/\/+$|\/+/g,'')+'/#logo'};
        graph.push(loc);
    });
    if(subOrgs.length) org.subOrganization = subOrgs;

    // Services
    const catalog = [];
    document.querySelectorAll('#services-repeater .repeater-entry').forEach(entry => {
        const n = entry.id.replace('svc-','');
        if(!val('svc-name-'+n)) return;
        const slug = val('svc-name-'+n).toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const svcId = baseUrl.replace(/\/+$|\/+/g,'')+'/#service-'+slug;
        catalog.push({"@id":svcId});
        const svc = {"@type":val('svc-type-'+n)||'Service',"@id":svcId,"name":val('svc-name-'+n),"provider":{"@id":orgId}};
        if(val('svc-url-'+n)){svc.url=val('svc-url-'+n);svc.mainEntityOfPage={"@type":"WebPage","@id":val('svc-url-'+n)};}
        if(val('svc-desc-'+n))svc.description=val('svc-desc-'+n);
        const areas = getTagValues('svc-areas-'+n);
        if(areas.length) svc.areaServed = areas.map(a=>{const p=a.split(',').map(x=>x.trim());return p.length>=2?{"@type":"City","name":p[0],"containedInPlace":{"@type":"State","name":p[1]}}:{"@type":"AdministrativeArea","name":a};});
        graph.push(svc);
    });
    if(catalog.length) org.hasOfferCatalog = {"@type":"OfferCatalog","name":"Services","itemListElement":catalog};

    // Local Landmarks - technique to tie brand to local places
    document.querySelectorAll('#landmarks-list .repeater-entry').forEach(entry => {
        const n = entry.id.replace('landmark-','');
        if (!val('landmark-name-'+n)) return;
        const landmarkId = baseUrl.replace(/\/+$|\/+/g,'')+'/#landmark-'+n;
        const landmark = {
            "@type":val('landmark-type-'+n)||'LandmarksOrHistoricalBuildings',
            "@id":landmarkId,
            "name":val('landmark-name-'+n)
        };
        if (val('landmark-lat-'+n) && val('landmark-lng-'+n)) {
            landmark.geo = {"@type":"GeoCoordinates","latitude":parseFloat(val('landmark-lat-'+n)),"longitude":parseFloat(val('landmark-lng-'+n))};
        }
        if (val('landmark-wiki-'+n)) {
            landmark.sameAs = [val('landmark-wiki-'+n)];
        }
        graph.push(landmark);
        
        // Add reference to org
        if (!org.knowsAbout) org.knowsAbout = [];
        org.knowsAbout.push({"@id":landmarkId});
    });

    // Offer Catalog - Additional offers from advanced section
    const offers = [];
    document.querySelectorAll('#offers-list .repeater-entry').forEach(entry => {
        const n = entry.id.replace('offer-','');
        if (!val('offer-name-'+n)) return;
        const offerId = baseUrl.replace(/\/+$|\/+/g,'')+'/#offer-'+n;
        const offer = {
            "@type":"Offer",
            "@id":offerId,
            "itemOffered":{"@type":"Service","name":val('offer-name-'+n)}
        };
        if (val('offer-category-'+n)) offer.itemOffered.category = val('offer-category-'+n);
        if (val('offer-desc-'+n)) offer.itemOffered.description = val('offer-desc-'+n);
        if (val('offer-price-'+n)) {
            offer.price = val('offer-price-'+n).replace(/[^0-9.]/g,'');
            offer.priceCurrency = val('offer-currency-'+n)||'USD';
        }
        if (val('offer-url-'+n)) offer.url = val('offer-url-'+n);
        offers.push(offer);
        graph.push(offer);
    });
    
    // Add to org's hasOfferCatalog or create new one
    if (offers.length) {
        if (!org.hasOfferCatalog) {
            org.hasOfferCatalog = {"@type":"OfferCatalog","name":"Services","itemListElement":offers.map(o => ({"@id":o["@id"]}))};
        } else {
            offers.forEach(o => org.hasOfferCatalog.itemListElement.push({"@id":o["@id"]}));
        }
    }

    // FAQ
    const faqs = [];
    document.querySelectorAll('#faq-repeater .repeater-entry').forEach(entry => {
        const n = entry.id.replace('faq-','');
        if(val('faq-q-'+n)&&val('faq-a-'+n)) faqs.push({"@type":"Question","name":val('faq-q-'+n),"acceptedAnswer":{"@type":"Answer","text":val('faq-a-'+n)}});
    });
    if(faqs.length) graph.push({"@type":"FAQPage","@id":baseUrl.replace(/\/+$|\/+/g,'')+'/#faq',"mainEntity":faqs});

    return {"@context":"https://schema.org","@graph":cleanObj(graph)};
}


function parseHours(raw) {
    const dayMap = {Mo:'Monday',Tu:'Tuesday',We:'Wednesday',Th:'Thursday',Fr:'Friday',Sa:'Saturday',Su:'Sunday'};
    const specs = [];
    raw.split(',').map(s=>s.trim()).forEach(seg => {
        const m = seg.match(/^([A-Za-z]{2}(?:-[A-Za-z]{2})?)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
        if(!m) return;
        let days = [];
        if(m[1].includes('-')){const[s,e]=m[1].split('-');const k=Object.keys(dayMap);const si=k.indexOf(s),ei=k.indexOf(e);if(si>=0&&ei>=0)for(let i=si;i<=ei;i++)days.push(dayMap[k[i]]);}
        else if(dayMap[m[1]])days.push(dayMap[m[1]]);
        if(days.length)specs.push({"@type":"OpeningHoursSpecification","dayOfWeek":days,"opens":m[2],"closes":m[3]});
    });
    return specs.length ? specs : raw;
}

function cleanObj(o) {
    if(Array.isArray(o)) return o.map(cleanObj);
    if(o&&typeof o==='object'){const c={};for(const[k,v]of Object.entries(o))if(v!==undefined&&v!==null&&v!=='')c[k]=cleanObj(v);return c;}
    return o;
}

// ═══════════════════════════════════════════
//  OUTPUT / RENDER
// ═══════════════════════════════════════════
function renderOutput(schema) {
    const raw = JSON.stringify(schema, null, 2);
    // Update both possible output elements
    const jsonOutput = document.getElementById('json-output');
    const wizardJson = document.getElementById('wizard-json');
    if (jsonOutput) jsonOutput.innerHTML = syntaxHighlight(raw);
    if (wizardJson) wizardJson.innerHTML = syntaxHighlight(raw);
}

function syntaxHighlight(json) {
    json = json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return json.replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\&quot;])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
        let c='json-number'; if(/^"/.test(m)){c=/:$/.test(m)?'json-key':'json-string';}else if(/true|false/.test(m))c='json-boolean';else if(/null/.test(m))c='json-null';
        return `<span class="${c}">${m}</span>`;
    });
}

// ═══════════════════════════════════════════
//  VALIDATION
// ═══════════════════════════════════════════
function validateSchema() {
    const errors=[], warnings=[];
    if(!val('entity-name'))errors.push('Business Name is required.');
    if(!val('entity-url'))errors.push('Website URL is required.');
    else if(!isURL(val('entity-url')))errors.push('Website URL is not valid.');

    let validLoc=0;
    document.querySelectorAll('#locations-repeater .repeater-entry').forEach(e=>{const n=e.id.replace('loc-','');if(val('loc-name-'+n)&&val('loc-street-'+n)&&val('loc-city-'+n))validLoc++;else if(val('loc-name-'+n))warnings.push(`Location "${val('loc-name-'+n)}" missing complete address.`);});
    if(!validLoc)warnings.push('No complete locations. Add at least one for LocalBusiness schema.');

    document.querySelectorAll('#services-repeater .repeater-entry').forEach(e=>{const n=e.id.replace('svc-','');if(val('svc-name-'+n)&&!getTagValues('svc-areas-'+n).length)warnings.push(`Service "${val('svc-name-'+n)}" has no areaServed.`);});

    if(document.getElementById('reviews-enabled').checked){if(!val('review-value'))errors.push('Rating Value required.');if(!val('review-count'))errors.push('Review Count required.');}

    const sc = countSameAs();
    if(sc<3)warnings.push(`Only ${sc} sameAs links. Recommend 5+.`);
    if(!val('entity-logo'))warnings.push('No logo URL. Improves brand signals.');
    if(!val('entity-wikipedia')&&!val('entity-wikidata'))warnings.push('No Wikipedia/Wikidata links for Knowledge Graph.');

    const body = document.getElementById('validation-body');
    if(!errors.length&&!warnings.length) body.innerHTML=`<div class="validation-status valid">✅ Schema valid! No issues.</div>`;
    else if(!errors.length) body.innerHTML=`<div class="validation-status valid">✅ Valid with ${warnings.length} suggestion(s).</div><ul class="validation-errors">${warnings.map(w=>`<li class="warn">⚠️ ${w}</li>`).join('')}</ul>`;
    else body.innerHTML=`<div class="validation-status invalid">❌ ${errors.length} error(s), ${warnings.length} warning(s).</div><ul class="validation-errors">${errors.map(e=>`<li>❌ ${e}</li>`).join('')}${warnings.map(w=>`<li class="warn">⚠️ ${w}</li>`).join('')}</ul>`;
}

function countSameAs() {
    let c=0;
    ['social-facebook','social-instagram','social-linkedin','social-twitter','social-youtube','social-tiktok','dir-google','dir-apple','dir-yelp','dir-bbb'].forEach(id=>{if(val(id))c++;});
    c+=getTagValues('sameAs-tags').length;
    if(val('entity-wikipedia'))c++;if(val('entity-wikidata'))c++;return c;
}
function isURL(s){try{new URL(s);return true;}catch(_){return false;}}

function updateWizardStats(schema) {
    const g=schema['@graph']||[]; const types={}; let props=0;
    g.forEach(e=>{types[e['@type']]=(types[e['@type']]||0)+1;props+=cntProps(e);});
    const locs=document.querySelectorAll('#locations-repeater .repeater-entry').length;
    const svcs=document.querySelectorAll('#services-repeater .repeater-entry').length;
    const faqs=document.querySelectorAll('#faq-repeater .repeater-entry').length;
    const statsBody = document.getElementById('stats-body');
    if (!statsBody) return; // Element doesn't exist on this page
    statsBody.innerHTML=`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="text-sm"><span style="color:var(--primary-light)">⬡</span> Entities: <strong>${g.length}</strong></div>
            <div class="text-sm"><span style="color:var(--green)">⬡</span> Properties: <strong>${props}</strong></div>
            <div class="text-sm"><span style="color:var(--accent)">⬡</span> Locations: <strong>${locs}</strong></div>
            <div class="text-sm"><span style="color:var(--blue)">⬡</span> Services: <strong>${svcs}</strong></div>
            <div class="text-sm"><span style="color:var(--pink)">⬡</span> FAQs: <strong>${faqs}</strong></div>
            <div class="text-sm"><span style="color:var(--cyan)">⬡</span> sameAs: <strong>${countSameAs()}</strong></div>
        </div>
        <div class="divider" style="margin:8px 0"></div>
        <div class="text-xs text-muted">Types: ${Object.entries(types).map(([k,v])=>`<strong>${k}</strong>(${v})`).join(', ')}</div>`;
}
function cntProps(o){let c=0;for(const k of Object.keys(o)){if(k.startsWith('@'))continue;c++;if(o[k]&&typeof o[k]==='object'&&!Array.isArray(o[k]))c+=cntProps(o[k]);}return c;}

// ═══════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════
// Minified output (recommendation to prevent easy copying)
function getJSONMinified() { return JSON.stringify(buildSchema()); }

// Pretty printed output (default)
function getJSON() { return JSON.stringify(buildSchema(),null,2); }

// Copy minified version
function copyMinified() { 
    const json = getJSONMinified();
    navigator.clipboard.writeText(json).then(()=>showToast('Minified schema copied!','success')).catch(()=>{
        const t=document.createElement('textarea');
        t.value=json;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
        showToast('Minified schema copied!','success');
    }); 
}

// Download minified version
function downloadMinifiedJSON() { 
    dl(getJSONMinified(),'application/ld+json',(val('entity-name')||'schema').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-schema-min.json'); 
}
function copyToClipboard() { navigator.clipboard.writeText(getJSON()).then(()=>showToast('Copied!','success')).catch(()=>{const t=document.createElement('textarea');t.value=getJSON();document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showToast('Copied!','success');}); }
function downloadJSON() { dl(getJSON(),'application/ld+json',(val('entity-name')||'schema').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-schema.json'); }

// ─── Schema Testing Functions ──────────────────────────────────────────────
function openSchemaTestModal(json) {
    if (!json || json.trim() === '') { showToast('No schema to test', 'warning'); return; }
    // Copy to clipboard
    navigator.clipboard.writeText(json).then(() => {}).catch(() => {
        const t = document.createElement('textarea');
        t.value = json; document.body.appendChild(t); t.select();
        document.execCommand('copy'); document.body.removeChild(t);
    });
    // Show modal
    const modal = document.getElementById('schema-test-modal');
    if (modal) modal.style.display = 'flex';
    else {
        // Fallback: open Schema Markup Validator directly
        window.open('https://developers.google.com/search/docs/appearance/structured-data', '_blank');
        showToast('Schema copied! Paste it in the validator tool', 'success');
    }
}

function testSchemaWithGoogle() {
    const json = getJSON();
    if (!json || json === '{"@context":"https://schema.org","@graph":[]}') {
        showToast('Please fill in schema details first', 'warning');
        return;
    }
    openSchemaTestModal(json);
}

function testSchemaWithSchemaOrg() {
    const json = getJSON();
    if (!json || json === '{"@context":"https://schema.org","@graph":[]}') {
        showToast('Please fill in schema details first', 'warning');
        return;
    }
    navigator.clipboard.writeText(json);
    window.open('https://validator.schema.org/', '_blank');
}

function testStructuredDataLinter() {
    const json = getJSON();
    navigator.clipboard.writeText(json);
    window.open('https://webmaster.yandex.com/tools/microformats/', '_blank');
}

function testAutoDetectSchema() {
    const el = document.getElementById('autodetect-json');
    if (!el) { showToast('No schema data found', 'error'); return; }
    const json = el.textContent || el.innerText;
    if (!json || json.trim() === '') { showToast('No schema to test', 'warning'); return; }
    openSchemaTestModal(json);
}

function testEnhancedSchema() {
    const el = document.getElementById('enhanced-json');
    if (!el) { showToast('No enhanced schema found', 'error'); return; }
    const json = el.textContent || el.innerText;
    if (!json || json.trim() === '') { showToast('No schema to test', 'warning'); return; }
    openSchemaTestModal(json);
}

// ═══════════════════════════════════════════════════════════════
//  SUGGESTION WIZARD & ENHANCED SCHEMA MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Copy minified enhanced schema
function copyMinifiedEnhanced() {
    const el = document.getElementById('enhanced-json');
    if (!el) { showToast('No enhanced schema found', 'error'); return; }
    // Get clean JSON text (strip HTML tags)
    const raw = el.textContent || el.innerText;
    try {
        const parsed = JSON.parse(raw);
        const minified = JSON.stringify(parsed);
        navigator.clipboard.writeText(minified).then(() => showToast('Minified schema copied!', 'success'))
            .catch(() => { const t=document.createElement('textarea');t.value=minified;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showToast('Minified schema copied!','success'); });
    } catch(e) {
        navigator.clipboard.writeText(raw).then(() => showToast('Copied!', 'success'));
    }
}

// Test the enhanced schema
function testEnhancedSchema() {
    const el = document.getElementById('enhanced-json');
    if (!el) { showToast('No enhanced schema found', 'error'); return; }
    const raw = el.textContent || el.innerText;
    if (!raw || raw.trim() === '') { showToast('No schema to test', 'warning'); return; }
    window.open('https://developers.google.com/search/docs/appearance/structured-data', '_blank');
    navigator.clipboard.writeText(raw).then(() => showToast('Schema copied! Paste it in the Schema Markup Validator', 'success'));
}

// ─── Suggestion Wizard ─────────────────────────────────────────────────────

// Wizard config per suggestion field
const SUGGESTION_WIZARDS = {
    'sameAs': {
        title: '🔗 Add sameAs Links',
        icon: '🔗',
        color: '#EC4899',
        description: 'Link to ALL citations, directories, social profiles, Wikipedia, Wikidata, and press mentions. The more authoritative sameAs links, the stronger your entity footprint.',
        steps: [
            {
                id: 'all-profiles',
                title: 'Add Your Profile Links',
                instruction: 'Enter URLs for all your social profiles, directory listings, and authority links. Click 🔍 Search to auto-find profiles.',
                fields: [
                    // Social Profiles
                    {id:'sa-facebook', label:'Facebook Page URL', placeholder:'https://facebook.com/yourbusiness', group:'Social Profiles'},
                    {id:'sa-twitter', label:'Twitter/X URL', placeholder:'https://twitter.com/yourbusiness', group:'Social Profiles'},
                    {id:'sa-linkedin', label:'LinkedIn Company URL', placeholder:'https://linkedin.com/company/...', group:'Social Profiles'},
                    {id:'sa-youtube', label:'YouTube Channel URL', placeholder:'https://youtube.com/@yourbusiness', group:'Social Profiles'},
                    {id:'sa-instagram', label:'Instagram URL', placeholder:'https://instagram.com/yourbusiness', group:'Social Profiles'},
                    // Directory & Citation
                    {id:'sa-gmb', label:'Google Business Profile URL', placeholder:'https://maps.google.com/...', group:'Directories & Citations'},
                    {id:'sa-yelp', label:'Yelp URL', placeholder:'https://yelp.com/biz/...', group:'Directories & Citations'},
                    {id:'sa-bbb', label:'Better Business Bureau URL', placeholder:'https://bbb.org/...', group:'Directories & Citations'},
                    {id:'sa-crunchbase', label:'Crunchbase URL', placeholder:'https://crunchbase.com/...', group:'Directories & Citations'},
                    {id:'sa-foursquare', label:'Foursquare URL', placeholder:'https://foursquare.com/v/...', group:'Directories & Citations'},
                    // Authority Links
                    {id:'sa-wikipedia', label:'Wikipedia Article URL', placeholder:'https://en.wikipedia.org/wiki/...', group:'Authority & Press'},
                    {id:'sa-wikidata', label:'Wikidata Entity URL', placeholder:'https://www.wikidata.org/wiki/Q...', group:'Authority & Press'},
                    {id:'sa-press1', label:'Press Mention / Award URL 1', placeholder:'https://...', group:'Authority & Press'},
                    {id:'sa-press2', label:'Press Mention / Award URL 2', placeholder:'https://...', group:'Authority & Press'},
                    {id:'sa-press3', label:'Press Mention / Award URL 3', placeholder:'https://...', group:'Authority & Press'}
                ]
            }
        ]
    },
    'knowsAbout': {
        title: '🧠 Add knowsAbout Entities',
        icon: '🧠',
        color: '#F97316',
        description: 'knowsAbout is one of the FOUR most powerful schema properties. Link to Wikipedia, Wikidata (Q-codes), and Google Machine IDs for every topic your business is an expert in.',
        steps: [
            {
                id: 'topics',
                title: 'Step 1: Your Expertise Topics',
                instruction: 'List the main topics your business knows about. Use your core services and industry terms. These will be linked to Knowledge Graph entities.',
                fields: [
                    {id:'ka-topic1', label:'Primary Topic / Service', placeholder:'Search Engine Optimization'},
                    {id:'ka-topic2', label:'Topic 2', placeholder:'Content Marketing'},
                    {id:'ka-topic3', label:'Topic 3', placeholder:'Web Design'},
                    {id:'ka-topic4', label:'Topic 4', placeholder:'Digital Marketing'},
                    {id:'ka-topic5', label:'Topic 5', placeholder:'Pay Per Click Advertising'}
                ]
            },
            {
                id: 'wiki-links',
                title: 'Step 2: Wikipedia Links',
                instruction: 'For each topic, find its Wikipedia article URL. This links your schema to established Knowledge Graph entities. Go to en.wikipedia.org and search for your topics.',
                fields: [
                    {id:'ka-wiki1', label:'Wikipedia URL for Topic 1', placeholder:'https://en.wikipedia.org/wiki/Search_engine_optimization'},
                    {id:'ka-wiki2', label:'Wikipedia URL for Topic 2', placeholder:'https://en.wikipedia.org/wiki/Content_marketing'},
                    {id:'ka-wiki3', label:'Wikipedia URL for Topic 3', placeholder:'https://en.wikipedia.org/wiki/Web_design'},
                    {id:'ka-wiki4', label:'Wikipedia URL for Topic 4', placeholder:'https://en.wikipedia.org/wiki/Digital_marketing'},
                    {id:'ka-wiki5', label:'Wikipedia URL for Topic 5', placeholder:'https://en.wikipedia.org/wiki/Pay-per-click'}
                ]
            },
            {
                id: 'wikidata-ids',
                title: 'Step 3: Wikidata Q-Codes (Powerful!)',
                instruction: '🚀 PRO TIP: Add Wikidata Q-codes (Google Machine IDs) for the most powerful entity linking. Find Q-codes at wikidata.org by searching for your topic. Example: SEO = Q316680',
                fields: [
                    {id:'ka-wd1', label:'Wikidata Q-Code for Topic 1', placeholder:'Q316680'},
                    {id:'ka-wd2', label:'Wikidata Q-Code for Topic 2', placeholder:'Q1167210'},
                    {id:'ka-wd3', label:'Wikidata Q-Code for Topic 3', placeholder:'Q37033'},
                    {id:'ka-wd4', label:'Wikidata Q-Code for Topic 4', placeholder:'Q117246'},
                    {id:'ka-wd5', label:'Wikidata Q-Code for Topic 5', placeholder:'Q162585'}
                ]
            }
        ]
    },
    'areaServed': {
        title: '📍 Add areaServed with Geo-Circle',
        icon: '📍',
        color: '#10B981',
        description: 'Use a geo-circle to define your service radius. This is more powerful than just listing city names — it creates a geographic entity in the Knowledge Graph.',
        steps: [
            {
                id: 'primary-area',
                title: 'Step 1: Primary Service Area',
                instruction: 'Enter your primary city and state where you serve clients.',
                fields: [
                    {id:'area-primary-city', label:'Primary City', placeholder:'Phoenix'},
                    {id:'area-primary-state', label:'State/Region', placeholder:'Arizona'},
                    {id:'area-radius', label:'Service Radius (miles)', placeholder:'50', type:'number'},
                    {id:'area-lat', label:'Business Latitude', placeholder:'33.4484'},
                    {id:'area-lng', label:'Business Longitude', placeholder:'-112.0740'}
                ]
            },
            {
                id: 'additional-areas',
                title: 'Step 2: Additional Service Cities',
                instruction: 'List additional cities or regions you serve (one per field):',
                fields: [
                    {id:'area-city2', label:'City 2', placeholder:'Scottsdale'},
                    {id:'area-city3', label:'City 3', placeholder:'Tempe'},
                    {id:'area-city4', label:'City 4', placeholder:'Mesa'},
                    {id:'area-city5', label:'City 5', placeholder:'Chandler'},
                    {id:'area-city6', label:'City 6', placeholder:'Gilbert'}
                ]
            }
        ]
    },
    'potentialAction': {
        title: '⚡ Add potentialAction (CTAs)',
        icon: '⚡',
        color: '#8B5CF6',
        description: 'PotentialAction tells search engines what users can DO on your site. Always add contact form actions and phone call actions to maximize conversion signals.',
        steps: [
            {
                id: 'actions',
                title: 'Step 1: Define Your CTAs',
                instruction: 'Enter the URLs for your main call-to-action pages:',
                fields: [
                    {id:'pa-contact', label:'Contact Form URL', placeholder:'https://example.com/contact'},
                    {id:'pa-phone', label:'Phone Number (for tel: action)', placeholder:'+15551234567'},
                    {id:'pa-booking', label:'Booking/Appointment URL (optional)', placeholder:'https://example.com/book'},
                    {id:'pa-quote', label:'Get a Quote URL (optional)', placeholder:'https://example.com/quote'},
                    {id:'pa-order', label:'Order/Buy URL (optional)', placeholder:'https://example.com/order'}
                ]
            }
        ]
    },
    'founder': {
        title: '👤 Add Founder / Employee Person Schemas',
        icon: '👤',
        color: '#60A5FA',
        description: 'Person schemas dramatically improve E-E-A-T (Experience, Expertise, Authoritativeness, Trust). Add your founders, key employees, and subject matter experts. Include Wikipedia if available.',
        steps: [
            {
                id: 'person1',
                title: 'Step 1: Primary Person (Founder/Owner)',
                instruction: 'Enter details for your main person entity:',
                fields: [
                    {id:'fp-name', label:'Full Name *', placeholder:'Dr. Jane Smith'},
                    {id:'fp-title', label:'Job Title', placeholder:'CEO & Founder'},
                    {id:'fp-email', label:'Professional Email (optional)', placeholder:'jane@example.com'},
                    {id:'fp-wikipedia', label:'Wikipedia URL (very powerful!)', placeholder:'https://en.wikipedia.org/wiki/...'},
                    {id:'fp-linkedin', label:'LinkedIn Profile URL', placeholder:'https://linkedin.com/in/...'},
                    {id:'fp-education', label:'Education (e.g. Harvard Law, JD)', placeholder:'Harvard Law School, JD 2005'},
                    {id:'fp-awards', label:'Awards (comma separated)', placeholder:'Best Lawyer 2023, Super Lawyers'},
                    {id:'fp-affiliations', label:'Affiliations (comma separated)', placeholder:'State Bar of AZ, ABA'}
                ]
            },
            {
                id: 'person2',
                title: 'Step 2: Additional Person (Optional)',
                instruction: 'Add a second key person (co-founder, partner, key employee):',
                fields: [
                    {id:'fp2-name', label:'Full Name', placeholder:'John Doe'},
                    {id:'fp2-title', label:'Job Title', placeholder:'CTO & Co-Founder'},
                    {id:'fp2-linkedin', label:'LinkedIn Profile URL', placeholder:'https://linkedin.com/in/...'},
                    {id:'fp2-wikipedia', label:'Wikipedia URL (optional)', placeholder:'https://en.wikipedia.org/wiki/...'}
                ]
            }
        ]
    },
    'hasOfferCatalog': {
        title: '📋 Add Offer Catalog (Services List)',
        icon: '📋',
        color: '#F59E0B',
        description: 'List ALL services in a structured OfferCatalog. This creates a complete service inventory that search engines can index individually.',
        steps: [
            {
                id: 'offers',
                title: 'Step 1: Define Your Services',
                instruction: 'List up to 6 services. Each becomes a structured Service entity in your schema.',
                fields: [
                    {id:'oc-svc1', label:'Service 1 Name *', placeholder:'SEO Consulting'},
                    {id:'oc-svc2', label:'Service 2 Name', placeholder:'Web Design'},
                    {id:'oc-svc3', label:'Service 3 Name', placeholder:'Content Marketing'},
                    {id:'oc-svc4', label:'Service 4 Name', placeholder:'PPC Management'},
                    {id:'oc-svc5', label:'Service 5 Name', placeholder:'Social Media Marketing'},
                    {id:'oc-svc6', label:'Service 6 Name', placeholder:'Email Marketing'}
                ]
            },
            {
                id: 'offer-urls',
                title: 'Step 2: Service Page URLs (Optional)',
                instruction: 'Enter the URL for each service page (creates mainEntityOfPage links):',
                fields: [
                    {id:'oc-url1', label:'URL for Service 1', placeholder:'https://example.com/services/seo'},
                    {id:'oc-url2', label:'URL for Service 2', placeholder:'https://example.com/services/web-design'},
                    {id:'oc-url3', label:'URL for Service 3', placeholder:'https://example.com/services/content'},
                    {id:'oc-url4', label:'URL for Service 4', placeholder:'https://example.com/services/ppc'},
                    {id:'oc-url5', label:'URL for Service 5', placeholder:'https://example.com/services/social'},
                    {id:'oc-url6', label:'URL for Service 6', placeholder:'https://example.com/services/email'}
                ]
            }
        ]
    },
    'aggregateRating': {
        title: '⭐ Add Aggregate Rating',
        icon: '⭐',
        color: '#FBBF24',
        description: 'Aggregate ratings create star snippets in Google search results — one of the highest CTR-boosting features available. Always include review schema with real data.',
        steps: [
            {
                id: 'rating',
                title: 'Step 1: Your Review Data',
                instruction: 'Enter your aggregate rating data from Google, Yelp, or other platforms:',
                fields: [
                    {id:'ar-value', label:'Average Rating (e.g. 4.8)', placeholder:'4.8', type:'number'},
                    {id:'ar-best', label:'Best Possible Rating', placeholder:'5'},
                    {id:'ar-count', label:'Total Review Count', placeholder:'127', type:'number'},
                    {id:'ar-source', label:'Primary Review Source', placeholder:'Google Business Profile'}
                ]
            }
        ]
    },

    // ── ARTICLE / BLOG WIZARDS ──────────────────────────────────────────────

    'addBlogPosting': {
        title: '📝 Add BlogPosting Schema',
        icon: '📝',
        color: '#3B82F6',
        description: 'BlogPosting schema tells Google this is a blog article, enabling rich results including article cards, Google Discover eligibility, and E-E-A-T signals. Fill in as many fields as possible for maximum impact.',
        steps: [
            {
                id: 'article-basics',
                title: 'Step 1: Article Details',
                instruction: 'Enter the core details about this blog post:',
                fields: [
                    {id:'bp-headline', label:'Article Headline *', placeholder:'The Ultimate Room-by-Room Declutter Checklist'},
                    {id:'bp-description', label:'Article Description / Summary *', placeholder:'A comprehensive guide to decluttering every room in your home...'},
                    {id:'bp-url', label:'Article URL *', placeholder:'https://example.com/blog/your-post'},
                    {id:'bp-date-pub', label:'Date Published (YYYY-MM-DD) *', placeholder:'2024-01-15'},
                    {id:'bp-date-mod', label:'Date Modified (YYYY-MM-DD)', placeholder:'2024-06-01'},
                    {id:'bp-wordcount', label:'Word Count (approximate)', placeholder:'1500'},
                    {id:'bp-keywords', label:'Keywords (comma separated)', placeholder:'declutter, home organization, minimalism'}
                ]
            },
            {
                id: 'article-author',
                title: 'Step 2: Author Details',
                instruction: 'Author information is critical for E-E-A-T signals:',
                fields: [
                    {id:'bp-author-name', label:'Author Full Name *', placeholder:'Jane Smith'},
                    {id:'bp-author-url', label:'Author Profile URL', placeholder:'https://example.com/author/jane-smith'},
                    {id:'bp-author-twitter', label:'Author Twitter/X URL', placeholder:'https://twitter.com/janesmith'},
                    {id:'bp-author-linkedin', label:'Author LinkedIn URL', placeholder:'https://linkedin.com/in/janesmith'}
                ]
            },
            {
                id: 'article-image',
                title: 'Step 3: Article Image',
                instruction: 'A featured image is required for Google Discover and article rich results:',
                fields: [
                    {id:'bp-image-url', label:'Featured Image URL *', placeholder:'https://example.com/images/article-hero.jpg'},
                    {id:'bp-image-width', label:'Image Width (px)', placeholder:'1200'},
                    {id:'bp-image-height', label:'Image Height (px)', placeholder:'630'}
                ]
            }
        ]
    },

    'articleAuthor': {
        title: '👤 Add Author Person Schema',
        icon: '👤',
        color: '#8B5CF6',
        description: 'Author schema is the #1 E-E-A-T signal. Google uses author entities to understand expertise and trustworthiness. Link to all author profiles for maximum authority.',
        steps: [
            {
                id: 'author-info',
                title: 'Step 1: Author Details',
                instruction: 'Enter the author\'s information. The more complete, the stronger the E-E-A-T signal:',
                fields: [
                    {id:'aa-name', label:'Author Full Name *', placeholder:'Jane Smith'},
                    {id:'aa-url', label:'Author Page URL on This Site', placeholder:'https://example.com/author/jane-smith'},
                    {id:'aa-description', label:'Author Bio / Description', placeholder:'Jane is an expert home organizer with 10 years experience...'},
                    {id:'aa-image', label:'Author Photo URL', placeholder:'https://example.com/images/jane-smith.jpg'}
                ]
            },
            {
                id: 'author-profiles',
                title: 'Step 2: Author Profiles & sameAs',
                instruction: 'Link to all author profiles to strengthen entity recognition:',
                fields: [
                    {id:'aa-twitter', label:'Twitter/X Profile URL', placeholder:'https://twitter.com/janesmith'},
                    {id:'aa-linkedin', label:'LinkedIn Profile URL', placeholder:'https://linkedin.com/in/janesmith'},
                    {id:'aa-wikipedia', label:'Wikipedia Page URL (very powerful!)', placeholder:'https://en.wikipedia.org/wiki/Jane_Smith'},
                    {id:'aa-website', label:'Personal Website URL', placeholder:'https://janesmith.com'},
                    {id:'aa-youtube', label:'YouTube Channel URL', placeholder:'https://youtube.com/@janesmith'}
                ]
            }
        ]
    },

    'articleDate': {
        title: '📅 Add datePublished & dateModified',
        icon: '📅',
        color: '#10B981',
        description: 'Publish dates are required for article rich results and help Google understand content freshness. dateModified signals to Google that your content is kept up-to-date.',
        steps: [
            {
                id: 'dates',
                title: 'Article Dates',
                instruction: 'Enter the publish and last modified dates for this article:',
                fields: [
                    {id:'ad-published', label:'Date Published * (YYYY-MM-DD or ISO 8601)', placeholder:'2024-01-15'},
                    {id:'ad-modified', label:'Date Modified (YYYY-MM-DD or ISO 8601)', placeholder:'2024-06-01'},
                    {id:'ad-created', label:'Date Created (optional)', placeholder:'2024-01-10'}
                ]
            }
        ]
    },

    'articleImage': {
        title: '🖼️ Add Article Image Schema',
        icon: '🖼️',
        color: '#F59E0B',
        description: 'Article images are required for Google Discover and news article rich results. Use high-quality images with the correct dimensions (minimum 1200x630px recommended).',
        steps: [
            {
                id: 'image-details',
                title: 'Article Image Details',
                instruction: 'Enter the featured image details for this article:',
                fields: [
                    {id:'ai-url', label:'Image URL *', placeholder:'https://example.com/images/article-hero.jpg'},
                    {id:'ai-width', label:'Image Width (px) — min 1200 recommended', placeholder:'1200'},
                    {id:'ai-height', label:'Image Height (px) — min 630 recommended', placeholder:'630'},
                    {id:'ai-alt', label:'Image Alt Text / Caption', placeholder:'A clean and organized living room after decluttering'},
                    {id:'ai-caption', label:'Image Caption (optional)', placeholder:'Photo by Jane Smith'}
                ]
            }
        ]
    },

    'articlePublisher': {
        title: '🏢 Add Publisher Organization Link',
        icon: '🏢',
        color: '#6366F1',
        description: 'Linking the article to the publisher Organization entity strengthens E-E-A-T. It tells Google which organization is responsible for this content.',
        steps: [
            {
                id: 'publisher-details',
                title: 'Publisher Details',
                instruction: 'Enter the publisher organization details:',
                fields: [
                    {id:'ap-name', label:'Publisher Name *', placeholder:'Cheap Waste Ltd'},
                    {id:'ap-url', label:'Publisher Website URL *', placeholder:'https://cheapwaste.com'},
                    {id:'ap-logo', label:'Publisher Logo URL', placeholder:'https://cheapwaste.com/images/logo.png'},
                    {id:'ap-logo-width', label:'Logo Width (px)', placeholder:'300'},
                    {id:'ap-logo-height', label:'Logo Height (px)', placeholder:'60'}
                ]
            }
        ]
    },

    'addBreadcrumb': {
        title: '🍞 Add BreadcrumbList Schema',
        icon: '🍞',
        color: '#F97316',
        description: 'BreadcrumbList schema enables breadcrumb rich results in Google, showing navigation path directly in search snippets. This improves click-through rates and helps Google understand your site structure.',
        steps: [
            {
                id: 'breadcrumbs',
                title: 'Define Breadcrumb Trail',
                instruction: 'Enter each level of the breadcrumb path from Home to the current page:',
                fields: [
                    {id:'bc-1-name', label:'Level 1 Name (usually "Home")', placeholder:'Home'},
                    {id:'bc-1-url', label:'Level 1 URL', placeholder:'https://example.com'},
                    {id:'bc-2-name', label:'Level 2 Name', placeholder:'Blog'},
                    {id:'bc-2-url', label:'Level 2 URL', placeholder:'https://example.com/blog'},
                    {id:'bc-3-name', label:'Level 3 Name (current page)', placeholder:'The Ultimate Declutter Guide'},
                    {id:'bc-3-url', label:'Level 3 URL (optional for last item)', placeholder:''},
                    {id:'bc-4-name', label:'Level 4 Name (optional)', placeholder:''},
                    {id:'bc-4-url', label:'Level 4 URL (optional)', placeholder:''}
                ]
            }
        ]
    },

    'addHowTo': {
        title: '🔧 Add HowTo Schema',
        icon: '🔧',
        color: '#14B8A6',
        description: 'HowTo schema enables step-by-step rich results in Google — one of the most visually prominent SERP features. Google shows numbered steps directly in search results for tutorial and guide content.',
        steps: [
            {
                id: 'howto-basics',
                title: 'Step 1: HowTo Basics',
                instruction: 'Enter the core details about your how-to guide:',
                fields: [
                    {id:'ht-name', label:'HowTo Title *', placeholder:'How to Declutter Your Home in 7 Days'},
                    {id:'ht-description', label:'Description', placeholder:'A step-by-step guide to clearing clutter from every room...'},
                    {id:'ht-totaltime', label:'Total Time (ISO 8601, e.g. PT2H30M)', placeholder:'PT2H'},
                    {id:'ht-yield', label:'Yield / Result', placeholder:'A decluttered, organized home'},
                    {id:'ht-image', label:'Guide Image URL', placeholder:'https://example.com/images/howto-hero.jpg'}
                ]
            },
            {
                id: 'howto-steps',
                title: 'Step 2: Define Steps',
                instruction: 'List up to 6 steps. Each becomes a HowToStep in the schema:',
                fields: [
                    {id:'ht-s1', label:'Step 1 *', placeholder:'Gather all items from the room into one pile'},
                    {id:'ht-s2', label:'Step 2', placeholder:'Sort items into Keep, Donate, and Trash piles'},
                    {id:'ht-s3', label:'Step 3', placeholder:'Remove Donate and Trash items from the room'},
                    {id:'ht-s4', label:'Step 4', placeholder:'Organize remaining Keep items by category'},
                    {id:'ht-s5', label:'Step 5', placeholder:'Assign a permanent home to each category'},
                    {id:'ht-s6', label:'Step 6', placeholder:'Label storage containers for easy maintenance'}
                ]
            }
        ]
    },

    'addFAQPage': {
        title: '❓ Add FAQPage Schema',
        icon: '❓',
        color: '#EC4899',
        description: 'FAQPage schema enables Q&A rich results — Google shows expandable accordion questions directly in search results. ⚠️ CRITICAL: Your page MUST have visible FAQ content that matches this schema. Google penalizes mismatched FAQ schema!',
        steps: [
            {
                id: 'faq-items',
                title: 'FAQ Questions & Answers',
                instruction: '⚠️ IMPORTANT: These questions and answers MUST be visible on your page. Enter questions that appear in your actual FAQ section. Google will penalize schema that doesn\'t match visible content!',
                fields: [
                    {id:'fq-q1', label:'Question 1 *', placeholder:'How much does it cost to hire a waste removal service?'},
                    {id:'fq-a1', label:'Answer 1 *', placeholder:'Our waste removal services start from £50 for small loads...'},
                    {id:'fq-q2', label:'Question 2', placeholder:'How quickly can you collect my waste?'},
                    {id:'fq-a2', label:'Answer 2', placeholder:'We offer same-day and next-day collection...'},
                    {id:'fq-q3', label:'Question 3', placeholder:'What types of waste do you accept?'},
                    {id:'fq-a3', label:'Answer 3', placeholder:'We accept household waste, garden waste, construction debris...'},
                    {id:'fq-q4', label:'Question 4 (optional)', placeholder:'Are you licensed and insured?'},
                    {id:'fq-a4', label:'Answer 4 (optional)', placeholder:'Yes, we are fully licensed by the Environment Agency...'},
                    {id:'fq-q5', label:'Question 5 (optional)', placeholder:'Do you recycle the waste you collect?'},
                    {id:'fq-a5', label:'Answer 5 (optional)', placeholder:'We recycle up to 95% of the waste we collect...'}
                ]
            }
        ]
    },

    'addProduct': {
        title: '🛍️ Add Product Schema',
        icon: '🛍️',
        color: '#10B981',
        description: 'Product schema enables shopping rich results including price, availability, and star ratings directly in Google search. Essential for e-commerce and product pages.',
        steps: [
            {
                id: 'product-basics',
                title: 'Step 1: Product Details',
                instruction: 'Enter the core product information:',
                fields: [
                    {id:'pr-name', label:'Product Name *', placeholder:'Premium Waste Removal Service'},
                    {id:'pr-description', label:'Product Description', placeholder:'Professional same-day waste removal for homes and businesses...'},
                    {id:'pr-image', label:'Product Image URL', placeholder:'https://example.com/images/product.jpg'},
                    {id:'pr-sku', label:'SKU / Product ID', placeholder:'WR-001'},
                    {id:'pr-brand', label:'Brand Name', placeholder:'Cheap Waste'}
                ]
            },
            {
                id: 'product-offer',
                title: 'Step 2: Pricing & Availability',
                instruction: 'Enter pricing and availability information:',
                fields: [
                    {id:'pr-price', label:'Price *', placeholder:'49.99'},
                    {id:'pr-currency', label:'Currency (ISO 4217)', placeholder:'GBP'},
                    {id:'pr-availability', label:'Availability', placeholder:'InStock'},
                    {id:'pr-url', label:'Product Page URL', placeholder:'https://example.com/products/waste-removal'},
                    {id:'pr-condition', label:'Item Condition', placeholder:'NewCondition'}
                ]
            }
        ]
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // ENTITY LINKING WIZARDS (YouTube Advanced Schema Insights)
    // ─────────────────────────────────────────────────────────────────────────────

    'mentions': {
        title: '🔗 Add mentions (Entity Linking)',
        icon: '🔗',
        color: '#06B6D4',
        description: 'mentions is one of the FOUR most powerful schema properties (along with sameAs, knowsAbout, areaServed). Link to competitors, partners, tools, and authoritative entities in your industry. This builds your Knowledge Graph connections.',
        steps: [
            {
                id: 'mentions-entities',
                title: 'Step 1: Mention Entities',
                instruction: 'Link to other organizations, people, products, or concepts mentioned or related to your business. Use Wikipedia/Wikidata URLs for maximum entity strength.',
                fields: [
                    {id:'ment-competitor1', label:'Competitor 1 (Wikipedia/Website)', placeholder:'https://en.wikipedia.org/wiki/Competitor_Name', group:'Competitors'},
                    {id:'ment-competitor2', label:'Competitor 2 (Wikipedia/Website)', placeholder:'https://competitor.com', group:'Competitors'},
                    {id:'ment-partner1', label:'Partner Organization', placeholder:'https://partner-company.com', group:'Partners & Associations'},
                    {id:'ment-partner2', label:'Industry Association', placeholder:'https://industry-association.org', group:'Partners & Associations'},
                    {id:'ment-tool1', label:'Tool/Software Used', placeholder:'https://en.wikipedia.org/wiki/Software_Name', group:'Tools & Technologies'},
                    {id:'ment-tool2', label:'Tool/Software Used 2', placeholder:'https://software-tool.com', group:'Tools & Technologies'},
                    {id:'ment-concept1', label:'Industry Concept (Wikipedia)', placeholder:'https://en.wikipedia.org/wiki/Industry_Concept', group:'Industry Concepts'},
                    {id:'ment-concept2', label:'Related Topic (Wikipedia)', placeholder:'https://en.wikipedia.org/wiki/Related_Topic', group:'Industry Concepts'}
                ]
            },
            {
                id: 'mentions-wikidata',
                title: 'Step 2: Wikidata IDs (Advanced)',
                instruction: 'For even stronger entity linking, add Wikidata IDs (Q-codes) for your mentions. These are Google Machine IDs that power the Knowledge Graph.',
                fields: [
                    {id:'ment-wd1', label:'Wikidata ID (Q-code) for mention 1', placeholder:'Q123456'},
                    {id:'ment-wd2', label:'Wikidata ID (Q-code) for mention 2', placeholder:'Q789012'},
                    {id:'ment-wd3', label:'Wikidata ID (Q-code) for mention 3', placeholder:'Q345678'}
                ]
            }
        ]
    },

    'schemaGuidance': {
        title: '📚 Schema Stacking Strategy',
        icon: '📚',
        color: '#8B5CF6',
        description: 'Schema Stacking Strategy: Layer your schema from sitewide (Organization, WebSite) → service pages (Service, areaServed) → local pages (LocalBusiness, geo). This builds a complete entity footprint across your entire site.',
        steps: [
            {
                id: 'stacking-overview',
                title: 'Schema Stacking Strategy',
                instruction: `<div class="schema-guidance-panel">
                    <h4>🏗️ The 3-Layer Schema Stack</h4>
                    <div class="guidance-section">
                        <h5>Layer 1: Sitewide Schema (Every Page)</h5>
                        <ul>
                            <li><strong>Organization</strong> - Your core business entity with sameAs, knowsAbout, mentions</li>
                            <li><strong>WebSite</strong> - With SearchAction for sitelinks searchbox</li>
                        </ul>
                    </div>
                    <div class="guidance-section">
                        <h5>Layer 2: Service Page Schema</h5>
                        <ul>
                            <li><strong>Service</strong> - With areaServed, provider, offers</li>
                            <li><strong>Product</strong> - For product/service pages</li>
                            <li><strong>FAQPage</strong> - Only if visible FAQs exist on page!</li>
                        </ul>
                    </div>
                    <div class="guidance-section">
                        <h5>Layer 3: Local Page Schema</h5>
                        <ul>
                            <li><strong>LocalBusiness</strong> - With geo, openingHours, areaServed</li>
                            <li><strong>HowTo</strong> - For tutorial/guide pages</li>
                        </ul>
                    </div>
                    <div class="guidance-warning">
                        <h5>⚠️ Important Warnings</h5>
                        <ul>
                            <li><strong>Homepage vs Sitewide:</strong> Organization schema on homepage should be your canonical entity. Service pages can reference it via @id.</li>
                            <li><strong>FAQPage Warning:</strong> Only add FAQPage if there are visible Q&As on the page. Google penalizes mismatched FAQ schema!</li>
                            <li><strong>Don't Duplicate:</strong> Use @id references to link entities instead of duplicating Organization on every page.</li>
                        </ul>
                    </div>
                </div>`,
                fields: []
            }
        ]
    },

    // ─── ENTITY EXPANSION WIZARDS ──────────────────────────────────────────────

    'foundingDate': {
        title: '📅 Add Founding Date',
        icon: '📅',
        color: '#10B981',
        description: 'foundingDate is a powerful trust signal. When Google sees your founding year in both the page content and schema, it strengthens organizational credibility and Knowledge Graph confidence.',
        steps: [
            {
                id: 'founding',
                title: 'Founding Information',
                instruction: 'Enter the year or date your organization was founded. This matches the content already on your page.',
                fields: [
                    {id:'fd-year', label:'Founding Year *', placeholder:'2005'},
                    {id:'fd-city', label:'Founding City (optional)', placeholder:'Phoenix'},
                    {id:'fd-state', label:'Founding State/Country (optional)', placeholder:'Arizona, USA'}
                ]
            }
        ]
    },

    'credentialTrust': {
        title: '🏅 Add Credentials & Awards',
        icon: '🏅',
        color: '#F59E0B',
        description: 'Certifications, accreditations, memberships, and awards are top E-E-A-T signals. Adding them to schema as award or memberOf properties tells Google your organization is legitimately credentialed.',
        steps: [
            {
                id: 'awards',
                title: 'Step 1: Awards & Recognitions',
                instruction: 'List awards, certifications, and recognitions your organization has received:',
                fields: [
                    {id:'ct-award1', label:'Award / Certification 1 *', placeholder:'BBB A+ Accredited Business'},
                    {id:'ct-award2', label:'Award / Certification 2', placeholder:'Inc. 5000 Fastest Growing Companies 2023'},
                    {id:'ct-award3', label:'Award / Certification 3', placeholder:'Google Premier Partner'},
                    {id:'ct-award4', label:'Award / Certification 4', placeholder:'ISO 9001 Certified'},
                    {id:'ct-award5', label:'Award / Certification 5', placeholder:'Best of City Award'}
                ]
            },
            {
                id: 'memberships',
                title: 'Step 2: Associations & Memberships',
                instruction: 'List professional associations, chambers, or industry bodies your organization belongs to:',
                fields: [
                    {id:'ct-assoc1', label:'Association / Body 1', placeholder:'Chamber of Commerce'},
                    {id:'ct-assoc-url1', label:'Association URL 1', placeholder:'https://chamber.org/member/...'},
                    {id:'ct-assoc2', label:'Association / Body 2', placeholder:'National Industry Association'},
                    {id:'ct-assoc-url2', label:'Association URL 2', placeholder:'https://industry-assoc.org/...'},
                    {id:'ct-assoc3', label:'Association / Body 3', placeholder:'State Licensing Board'}
                ]
            }
        ]
    },

    'numberOfEmployees': {
        title: '👥 Add Team Size',
        icon: '👥',
        color: '#3B82F6',
        description: 'numberOfEmployees adds organizational credibility. A verified team size (matching page content) signals to Google that your entity claim is consistent and trustworthy.',
        steps: [
            {
                id: 'employees',
                title: 'Organization Size',
                instruction: 'Enter your organization\'s team size as shown on your website:',
                fields: [
                    {id:'ne-count', label:'Number of Employees *', placeholder:'50', type:'number'},
                    {id:'ne-min', label:'Minimum (range, optional)', placeholder:'40'},
                    {id:'ne-max', label:'Maximum (range, optional)', placeholder:'60'}
                ]
            }
        ]
    },

    'aggregateRatingTrust': {
        title: '⭐ Add Aggregate Rating (Trust)',
        icon: '⭐',
        color: '#FBBF24',
        description: 'Your page already shows review data — adding aggregateRating to schema enables star snippets in search results, one of the highest CTR-boosting rich result features available.',
        steps: [
            {
                id: 'rating',
                title: 'Your Review Data',
                instruction: 'Enter your aggregate rating data matching what\'s shown on your page:',
                fields: [
                    {id:'art-value', label:'Average Rating *', placeholder:'4.8', type:'number'},
                    {id:'art-best', label:'Best Possible Rating', placeholder:'5'},
                    {id:'art-count', label:'Total Review Count *', placeholder:'127', type:'number'},
                    {id:'art-source', label:'Primary Review Source', placeholder:'Google Business Profile'}
                ]
            }
        ]
    },

    'branchRelationship': {
        title: '🏢 Add Branch / Department Nodes',
        icon: '🏢',
        color: '#8B5CF6',
        description: 'Multiple-location businesses benefit from department or subOrganization nodes. Each branch becomes a distinct schema entity, improving local SEO for each location individually.',
        steps: [
            {
                id: 'branches',
                title: 'Branch Locations',
                instruction: 'Enter each location/branch as a separate entity:',
                fields: [
                    {id:'br-name1', label:'Branch 1 Name *', placeholder:'Downtown Phoenix Office'},
                    {id:'br-addr1', label:'Branch 1 Address', placeholder:'123 Main St, Phoenix, AZ 85001'},
                    {id:'br-phone1', label:'Branch 1 Phone', placeholder:'+16025551234'},
                    {id:'br-name2', label:'Branch 2 Name', placeholder:'Scottsdale Office'},
                    {id:'br-addr2', label:'Branch 2 Address', placeholder:'456 Oak Ave, Scottsdale, AZ 85251'},
                    {id:'br-phone2', label:'Branch 2 Phone', placeholder:'+16025555678'}
                ]
            }
        ]
    },

    'practitionerPerson': {
        title: '👨‍⚕️ Add Practitioner Person Schema',
        icon: '👨‍⚕️',
        color: '#EC4899',
        description: 'Practitioner pages (doctors, lawyers, therapists) need a dedicated Person entity with credentials, specialty, and sameAs links. This is the #1 E-E-A-T signal for professional service pages.',
        steps: [
            {
                id: 'practitioner',
                title: 'Step 1: Practitioner Details',
                instruction: 'Enter the practitioner\'s details. The more complete, the stronger the E-E-A-T signal:',
                fields: [
                    {id:'pp-name', label:'Full Name *', placeholder:'Dr. Jane Smith, MD'},
                    {id:'pp-title', label:'Job Title / Credential *', placeholder:'Board-Certified Cardiologist'},
                    {id:'pp-specialty', label:'Medical/Legal Specialty', placeholder:'Cardiology'},
                    {id:'pp-description', label:'Bio / Description', placeholder:'Dr. Smith has 15+ years experience in interventional cardiology...'},
                    {id:'pp-education', label:'Education', placeholder:'Harvard Medical School, MD 2008'},
                    {id:'pp-license', label:'License Number (optional)', placeholder:'AZ-MD-12345'}
                ]
            },
            {
                id: 'practitioner-profiles',
                title: 'Step 2: Profiles & sameAs',
                instruction: 'Link to all professional profiles for maximum entity recognition:',
                fields: [
                    {id:'pp-linkedin', label:'LinkedIn Profile URL', placeholder:'https://linkedin.com/in/dr-jane-smith'},
                    {id:'pp-wikipedia', label:'Wikipedia Page URL (very powerful!)', placeholder:'https://en.wikipedia.org/wiki/Jane_Smith'},
                    {id:'pp-website', label:'Personal/Practice Website', placeholder:'https://drjanesmith.com'},
                    {id:'pp-healthgrades', label:'Healthgrades / Avvo / Martindale URL', placeholder:'https://healthgrades.com/physician/...'},
                    {id:'pp-hospital', label:'Hospital / Firm Affiliation URL', placeholder:'https://hospital.com/doctors/...'}
                ]
            }
        ]
    },

    'serviceNodes': {
        title: '⚙️ Add Service Entity Nodes',
        icon: '⚙️',
        color: '#10B981',
        description: 'Individual Service nodes give each offering its own schema entity with provider, areaServed, and serviceType. This is far stronger than listing services as plain text — each Service becomes a named entity in the Knowledge Graph.',
        steps: [
            {
                id: 'services',
                title: 'Step 1: Define Your Services',
                instruction: 'List the services offered on this page. Each becomes a separate Service schema node:',
                fields: [
                    {id:'sn-name1', label:'Service 1 Name *', placeholder:'Emergency Plumbing Repair'},
                    {id:'sn-type1', label:'Service 1 Type / Category', placeholder:'PlumbingService'},
                    {id:'sn-url1', label:'Service 1 Page URL', placeholder:'https://example.com/services/emergency-plumbing'},
                    {id:'sn-name2', label:'Service 2 Name', placeholder:'Water Heater Installation'},
                    {id:'sn-type2', label:'Service 2 Type', placeholder:'PlumbingService'},
                    {id:'sn-name3', label:'Service 3 Name', placeholder:'Drain Cleaning'},
                    {id:'sn-name4', label:'Service 4 Name (optional)', placeholder:'Pipe Repair'}
                ]
            },
            {
                id: 'service-area',
                title: 'Step 2: Service Area',
                instruction: 'Define where these services are offered:',
                fields: [
                    {id:'sn-city', label:'Primary City *', placeholder:'Phoenix'},
                    {id:'sn-state', label:'State / Region *', placeholder:'Arizona'},
                    {id:'sn-area2', label:'Additional Area 2', placeholder:'Scottsdale'},
                    {id:'sn-area3', label:'Additional Area 3', placeholder:'Tempe'},
                    {id:'sn-area4', label:'Additional Area 4', placeholder:'Mesa'}
                ]
            }
        ]
    },

    'medicalEntities': {
        title: '🏥 Add Medical Entity Schema',
        icon: '🏥',
        color: '#06B6D4',
        description: 'MedicalCondition, MedicalTherapy, and MedicalProcedure nodes establish clinical topic authority. These entities link directly to medical Knowledge Graph nodes and are essential for YMYL content.',
        steps: [
            {
                id: 'medical',
                title: 'Medical Entity Details',
                instruction: 'Enter the medical condition or treatment this page covers:',
                fields: [
                    {id:'me-type', label:'Entity Type (MedicalCondition / MedicalTherapy / MedicalProcedure)', placeholder:'MedicalCondition'},
                    {id:'me-name', label:'Condition / Treatment Name *', placeholder:'Atrial Fibrillation'},
                    {id:'me-description', label:'Clinical Description', placeholder:'A heart rhythm disorder characterized by...'},
                    {id:'me-specialty', label:'Medical Specialty', placeholder:'Cardiology'},
                    {id:'me-wikipedia', label:'Wikipedia URL for this condition', placeholder:'https://en.wikipedia.org/wiki/Atrial_fibrillation'},
                    {id:'me-wikidata', label:'Wikidata Q-code', placeholder:'Q181507'}
                ]
            }
        ]
    },

    'videoObject': {
        title: '🎬 Add VideoObject Schema',
        icon: '🎬',
        color: '#F97316',
        description: 'VideoObject schema enables Video rich results — Google shows video thumbnails, duration, and titles directly in search results. Essential for any page with embedded video content.',
        steps: [
            {
                id: 'video-basics',
                title: 'Step 1: Video Details',
                instruction: 'Enter the details for the video embedded on this page:',
                fields: [
                    {id:'vo-name', label:'Video Title *', placeholder:'How to Fix a Leaky Faucet in 5 Minutes'},
                    {id:'vo-description', label:'Video Description *', placeholder:'Step-by-step guide to fixing a leaky faucet...'},
                    {id:'vo-thumbnail', label:'Thumbnail Image URL *', placeholder:'https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg'},
                    {id:'vo-upload', label:'Upload Date (YYYY-MM-DD) *', placeholder:'2024-01-15'},
                    {id:'vo-duration', label:'Duration (ISO 8601: PT4M30S)', placeholder:'PT4M30S'}
                ]
            },
            {
                id: 'video-source',
                title: 'Step 2: Video Source',
                instruction: 'Enter the embed URL and content URL for the video:',
                fields: [
                    {id:'vo-embed', label:'Embed URL (YouTube/Vimeo embed link)', placeholder:'https://www.youtube.com/embed/VIDEO_ID'},
                    {id:'vo-content', label:'Content URL (direct video file, if any)', placeholder:'https://example.com/video/tutorial.mp4'},
                    {id:'vo-width', label:'Video Width (px)', placeholder:'1280'},
                    {id:'vo-height', label:'Video Height (px)', placeholder:'720'}
                ]
            }
        ]
    },

    'eventEntity': {
        title: '📅 Add Event / Course Schema',
        icon: '📅',
        color: '#8B5CF6',
        description: 'Event schema enables rich results for events, webinars, and courses — Google shows event cards with date, location, and registration links directly in search. Course schema links to educational Knowledge Graph entities.',
        steps: [
            {
                id: 'event-basics',
                title: 'Step 1: Event Details',
                instruction: 'Enter the event or course details:',
                fields: [
                    {id:'ev-type', label:'Entity Type (Event / Course / Webinar)', placeholder:'Event'},
                    {id:'ev-name', label:'Event / Course Name *', placeholder:'Advanced SEO Workshop 2024'},
                    {id:'ev-description', label:'Description *', placeholder:'A hands-on workshop covering advanced schema, KG optimization...'},
                    {id:'ev-start', label:'Start Date & Time (ISO 8601) *', placeholder:'2024-09-15T10:00:00-07:00'},
                    {id:'ev-end', label:'End Date & Time (ISO 8601)', placeholder:'2024-09-15T17:00:00-07:00'},
                    {id:'ev-url', label:'Registration / Event Page URL', placeholder:'https://example.com/events/seo-workshop'}
                ]
            },
            {
                id: 'event-location',
                title: 'Step 2: Location & Organizer',
                instruction: 'Specify where the event takes place and who organizes it:',
                fields: [
                    {id:'ev-location', label:'Venue Name or "Online"', placeholder:'Phoenix Convention Center'},
                    {id:'ev-address', label:'Venue Address (or leave blank for online)', placeholder:'100 N 3rd St, Phoenix, AZ 85004'},
                    {id:'ev-mode', label:'Event Attendance Mode (InPerson / Online / Mixed)', placeholder:'InPerson'},
                    {id:'ev-price', label:'Ticket Price (enter 0 if free)', placeholder:'99'},
                    {id:'ev-currency', label:'Currency', placeholder:'USD'}
                ]
            }
        ]
    },

    'articleAbout': {
        title: '📰 Add about/mentions to Article',
        icon: '📰',
        color: '#3B82F6',
        description: 'Linking your article to the primary topic entity via "about" and related concepts via "mentions" builds topical relevance in the Knowledge Graph. This is how Google connects your content to established entities.',
        steps: [
            {
                id: 'about',
                title: 'Step 1: Primary Topic (about)',
                instruction: 'What is this article primarily about? Find the Wikipedia/Wikidata page for the main topic:',
                fields: [
                    {id:'ab-topic', label:'Primary Topic Name *', placeholder:'Search Engine Optimization'},
                    {id:'ab-wiki', label:'Wikipedia URL for this topic', placeholder:'https://en.wikipedia.org/wiki/Search_engine_optimization'},
                    {id:'ab-wikidata', label:'Wikidata Q-code', placeholder:'Q316680'}
                ]
            },
            {
                id: 'mentions',
                title: 'Step 2: Mentioned Concepts (mentions)',
                instruction: 'List additional topics, tools, people, or organizations mentioned in this article:',
                fields: [
                    {id:'ab-ment1', label:'Mentioned Entity 1', placeholder:'Google Search'},
                    {id:'ab-wiki1', label:'Wikipedia URL for Entity 1', placeholder:'https://en.wikipedia.org/wiki/Google_Search'},
                    {id:'ab-ment2', label:'Mentioned Entity 2', placeholder:'Structured Data'},
                    {id:'ab-wiki2', label:'Wikipedia URL for Entity 2', placeholder:'https://en.wikipedia.org/wiki/Structured_data'},
                    {id:'ab-ment3', label:'Mentioned Entity 3', placeholder:'Knowledge Graph'},
                    {id:'ab-wiki3', label:'Wikipedia URL for Entity 3', placeholder:'https://en.wikipedia.org/wiki/Knowledge_Graph'},
                    {id:'ab-ment4', label:'Mentioned Entity 4 (optional)', placeholder:'Schema.org'}
                ]
            }
        ]
    },

    'professionalKnowsAbout': {
        title: '🧠 Add knowsAbout (Professional Authority)',
        icon: '🧠',
        color: '#F97316',
        description: 'For professional service organizations, knowsAbout is a critical topical authority signal. Link to Wikipedia/Wikidata entities for every core service and specialty to tell Google exactly what your organization knows.',
        steps: [
            {
                id: 'topics',
                title: 'Step 1: Your Core Topics',
                instruction: 'List the main services and topics your professional organization specializes in:',
                fields: [
                    {id:'pka-topic1', label:'Core Service / Specialty 1 *', placeholder:'Personal Injury Law'},
                    {id:'pka-topic2', label:'Core Service / Specialty 2', placeholder:'Workers Compensation'},
                    {id:'pka-topic3', label:'Core Service / Specialty 3', placeholder:'Medical Malpractice'},
                    {id:'pka-topic4', label:'Core Topic 4', placeholder:'Civil Litigation'},
                    {id:'pka-topic5', label:'Core Topic 5', placeholder:'Tort Law'}
                ]
            },
            {
                id: 'wiki-links',
                title: 'Step 2: Wikipedia & Wikidata Links',
                instruction: 'Link each topic to its Wikipedia article and Wikidata Q-code for maximum entity strength:',
                fields: [
                    {id:'pka-wiki1', label:'Wikipedia URL for Topic 1', placeholder:'https://en.wikipedia.org/wiki/Personal_injury_lawyer'},
                    {id:'pka-wd1', label:'Wikidata Q-code for Topic 1', placeholder:'Q2028919'},
                    {id:'pka-wiki2', label:'Wikipedia URL for Topic 2', placeholder:'https://en.wikipedia.org/wiki/Workers%27_compensation'},
                    {id:'pka-wd2', label:'Wikidata Q-code for Topic 2', placeholder:'Q208960'},
                    {id:'pka-wiki3', label:'Wikipedia URL for Topic 3', placeholder:'https://en.wikipedia.org/wiki/Medical_malpractice'}
                ]
            }
        ]
    }

};

let _wizardCurrentField = null;
let _wizardCurrentStep = 0;
let _wizardSteps = [];
let _wizardEntityName = '';
let _wizardAutoScanData = {};  // pre-filled data from page auto-scan

// ── Auto-scan page data for wizard pre-fill ──────────────────────────────────
// Extracts as much info as possible from the last scanned page to pre-populate
// wizard fields so the user just needs to confirm / correct.
function autoScanPageDataForWizard(field) {
    const html  = window._lastScannedHTML  || '';
    const url   = window._currentEnhancedURL || '';
    const title = window._currentEnhancedTitle || '';
    const schema = window._currentSchemaJSON || {};
    const graph  = schema['@graph'] || (schema['@type'] ? [schema] : []);

    // Helper: grab first match from html
    const pick = (patterns) => {
        for (const re of patterns) {
            const m = html.match(re);
            if (m && m[1] && m[1].trim()) return m[1].trim();
        }
        return '';
    };

    // Grab all sameAs from existing schema
    const existingSameAs = [];
    graph.forEach(e => {
        if (e.sameAs) {
            (Array.isArray(e.sameAs) ? e.sameAs : [e.sameAs]).forEach(s => existingSameAs.push(s));
        }
    });

    // Grab org entity
    const orgEntity = graph.find(e => ['Organization','LocalBusiness','MedicalOrganization','LegalService',
        'AccountingService','FinancialService','InsuranceAgency','AutoDealer'].includes(e['@type'])) || {};
    const personEntity = graph.find(e => e['@type'] === 'Person' || e['@type'] === 'Physician') || {};

    // Extract phone from html
    const phone = pick([
        /<a[^>]*href="tel:([^"]+)"/i,
        /\btel:\s*([\+\d\-\(\)\s]{7,20})/i,
        /"telephone"\s*:\s*"([^"]+)"/i
    ]) || orgEntity.telephone || '';

    // Extract email
    const email = pick([
        /<a[^>]*href="mailto:([^"]+)"/i,
        /"email"\s*:\s*"([^"]+)"/i
    ]) || orgEntity.email || '';

    // Extract address
    const streetAddress = orgEntity.address?.streetAddress || pick([/"streetAddress"\s*:\s*"([^"]+)"/i]);
    const addressCity   = orgEntity.address?.addressLocality || pick([/"addressLocality"\s*:\s*"([^"]+)"/i]);
    const addressState  = orgEntity.address?.addressRegion   || pick([/"addressRegion"\s*:\s*"([^"]+)"/i]);
    const postalCode    = orgEntity.address?.postalCode      || pick([/"postalCode"\s*:\s*"([^"]+)"/i]);

    // Extract founding date
    const foundingDate = orgEntity.foundingDate || pick([
        /"foundingDate"\s*:\s*"([^"]+)"/i,
        /founded\s+(?:in\s+)?(\d{4})/i,
        /established\s+(?:in\s+)?(\d{4})/i,
        /since\s+(\d{4})/i
    ]);

    // Extract employee count
    const numEmployees = pick([
        /"numberOfEmployees"[^}]*"value"\s*:\s*"?(\d+)"?/i,
        /(\d+)\s+employees/i,
        /team\s+of\s+(\d+)/i,
        /over\s+(\d+)\s+(?:employees|staff|people)/i
    ]) || (orgEntity.numberOfEmployees?.value || '');

    // Extract existing social/sameAs links
    const fbUrl   = existingSameAs.find(s => /facebook\.com/i.test(s))   || pick([/(?:content|href)="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i]);
    const twUrl   = existingSameAs.find(s => /twitter\.com|x\.com/i.test(s)) || pick([/(?:content|href)="(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"]+)"/i]);
    const liUrl   = existingSameAs.find(s => /linkedin\.com/i.test(s))   || pick([/(?:content|href)="(https?:\/\/(?:www\.)?linkedin\.com\/[^"]+)"/i]);
    const ytUrl   = existingSameAs.find(s => /youtube\.com/i.test(s))    || pick([/(?:content|href)="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"/i]);
    const igUrl   = existingSameAs.find(s => /instagram\.com/i.test(s))  || pick([/(?:content|href)="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i]);
    const yelpUrl = existingSameAs.find(s => /yelp\.com/i.test(s))       || pick([/(?:content|href)="(https?:\/\/(?:www\.)?yelp\.com\/biz\/[^"]+)"/i]);
    const wikiUrl = existingSameAs.find(s => /wikipedia\.org/i.test(s))  || '';
    const wikidataUrl = existingSameAs.find(s => /wikidata\.org/i.test(s)) || '';

    // Extract rating info
    const ratingValue = pick([/"ratingValue"\s*:\s*"?([0-9.]+)"?/i]) || '';
    const reviewCount = pick([/"reviewCount"\s*:\s*"?(\d+)"?/i, /"ratingCount"\s*:\s*"?(\d+)"?/i]) || '';

    // Extract person name from title or schema
    const personName = personEntity.name || pick([
        /"name"\s*:\s*"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)"/,
    ]) || '';
    const personTitle = personEntity.jobTitle || '';
    const personLinkedIn = personEntity.sameAs || '';
    const personWiki = (Array.isArray(personEntity.sameAs) ? personEntity.sameAs.find(s => /wikipedia/i.test(s)) : '') || '';

    // Extract contact/booking URL
    const contactUrl = pick([
        /href="([^"]*contact[^"]*)" (?:class|id)/i,
        /href="([^"]*\/contact\/?)" /i
    ]) || '';
    const bookingUrl = pick([
        /href="([^"]*(?:book|appointment|schedule)[^"]*)"/i
    ]) || '';

    // Services from knowsAbout/hasOfferCatalog
    const services = [];
    graph.forEach(e => {
        if (e.knowsAbout) (Array.isArray(e.knowsAbout) ? e.knowsAbout : [e.knowsAbout]).slice(0,5).forEach(s => {
            if (typeof s === 'string') services.push(s);
            else if (s.name) services.push(s.name);
        });
        if (e.hasOfferCatalog?.itemListElement) e.hasOfferCatalog.itemListElement.slice(0,5).forEach(s => {
            if (s.name) services.push(s.name);
        });
    });

    // Primary service area
    // Latitude/longitude from geo schema
    const geoLat = pick([/\"latitude\"\s*:\s*\"?([\d.-]+)\"?/i]) || '';
    const geoLng = pick([/\"longitude\"\s*:\s*\"?([\d.-]+)\"?/i]) || '';

        const areaCity  = (Array.isArray(orgEntity.areaServed) ? orgEntity.areaServed[0]?.name : orgEntity.areaServed?.name) || addressCity || '';
    const areaState = addressState || '';

    return {
        orgName: orgEntity.name || title.replace(/ [-|–].*/,'').trim(),
        url, phone, email,
        streetAddress, addressCity, addressState, postalCode,
        foundingDate, numEmployees,
        fbUrl, twUrl, liUrl, ytUrl, igUrl, yelpUrl, wikiUrl, wikidataUrl,
        ratingValue, reviewCount,
        personName, personTitle, personLinkedIn, personWiki,
        contactUrl, bookingUrl,
        services,
        areaCity, areaState,
        geoLat, geoLng,
        existingSameAs
    };
}

function _buildWizardTabs(steps) {
    return steps.map(function(s, i) {
        var activeClass = (i === 0) ? 'wizard-step-tab active' : 'wizard-step-tab';
        var shortTitle = s.title.replace(/Step \d+: /, '');
        return '<button class="' + activeClass + '" id="tab-' + i + '" onclick="goToWizardStep(' + i + ')">' + (i+1) + '. ' + shortTitle + '</button>';
    }).join('');
}

// Helper to mark a suggestion item as done in the UI
function _markSuggestionDone(field) {
    document.querySelectorAll('.change-suggest').forEach(item => {
        const btn = item.querySelector('.btn-generate, .btn-outline');
        if (btn && btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${field}'`)) {
            item.style.opacity = '0.4';
            const textEl = item.querySelector('.change-text');
            item.innerHTML = `<span class="change-icon">✅</span><span class="change-text" style="text-decoration:line-through;">${textEl ? textEl.textContent : ''}</span><span style="color:var(--accent-green);font-size:0.8rem;margin-left:8px;">Added!</span>`;
        }
    });
}

// Mark expansion items as done (targets .change-expansion items)
function _markExpansionDone(field) {
    document.querySelectorAll('.change-expansion').forEach(item => {
        const btn = item.querySelector('.btn-generate');
        if (btn && btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${field}'`)) {
            item.style.opacity = '0.4';
            const textEl = item.querySelector('.change-text');
            item.innerHTML = `<span style="font-size:1rem;">✅</span><div style="flex:1;min-width:0;"><span class="change-text" style="text-decoration:line-through;color:#64748b;">${textEl ? textEl.textContent : ''}</span><span style="color:#4ade80;font-size:0.8rem;margin-left:8px;">Added to schema!</span></div>`;
        }
    });
}

function showSuggestionInfo(field) {
    // Info messages for suggestions without wizards
    const infoMessages = {
        'addBlogPosting': 'BlogPosting schema helps Google understand your blog content. Add @type: BlogPosting with headline, datePublished, author, and image properties.',
        'articleAuthor': 'Author schema is critical for E-E-A-T. Create a Person entity with name, url, and sameAs links to the author\'s social profiles.',
        'articleDate': 'datePublished and dateModified are required for article rich results. Use ISO 8601 format (e.g., "2024-01-15T10:30:00Z").',
        'articleImage': 'Article images are required for Google Discover and rich results. Add an ImageObject with url, width, and height.',
        'addBreadcrumb': 'BreadcrumbList schema improves navigation rich results. Create a list of items with name and url for each navigation level.',
        'addHowTo': 'HowTo schema enables step-by-step rich results. Define name, step-by-step instructions with text or HowToStep objects.',
        'addFAQPage': 'FAQPage schema enables Q&A rich results. Create Question/Answer pairs for frequently asked questions.',
        'addProduct': 'Product schema enables shopping rich results. Add name, offers (with price, availability), and image properties.'
    };
    
    const message = infoMessages[field] || 'This enhancement improves your schema quality. Refer to schema.org documentation for details.';
    showToast(message, 'info', 5000);
}

function openSuggestionWizard(field, entityName) {
    const wizard = SUGGESTION_WIZARDS[field];
    if (!wizard) { showToast('No wizard available for: ' + field, 'warning'); return; }

    // ── Auto-scan: extract page data to pre-fill wizard fields ──
    _wizardAutoScanData = autoScanPageDataForWizard(field);
    
    _wizardCurrentField = field;
    _wizardCurrentStep = 0;
    _wizardSteps = wizard.steps;
    _wizardEntityName = entityName || '';
    
    // Build popover HTML
    const popover = document.getElementById('suggestion-wizard-popover');
    if (!popover) return;
    
    popover.innerHTML = `
        <div class="wizard-popover-inner">
            <div class="wizard-popover-header">
                <div class="wizard-header-content">
                    <span class="wizard-header-icon">${wizard.icon}</span>
                    <h3 class="wizard-popover-title">${wizard.title}</h3>
                    <p class="wizard-popover-subtitle">Entity: <strong>${escapeHtml(entityName)}</strong></p>
                </div>
                <button class="wizard-close-btn" onclick="closeSuggestionWizard()">✕</button>
            </div>
            <div class="wizard-popover-description">${wizard.description}</div>
            <div class="wizard-step-tabs">\n                ${_buildWizardTabs(wizard.steps)}\n            </div>\n            <div class="wizard-popover-body" id="wizard-body">
                ${renderWizardStep(wizard, 0)}
            </div>
            <div class="wizard-popover-footer">
                <span class="wizard-footer-left">Schema Enhancement Method &bull; ${wizard.steps.length} step${wizard.steps.length!==1?'s':''}</span>
                <div class="wizard-footer-right">
                    <button class="btn-wizard-cancel" onclick="wizardPrev()" id="wizard-prev-btn" style="display:none;">← Back</button>
                    <button class="btn-wizard-cancel" onclick="closeSuggestionWizard()" id="wizard-cancel-btn">Cancel</button>
                    <button class="btn-wizard-generate" onclick="wizardNext()" id="wizard-next-btn">Next Step →</button>
                    <button class="btn-wizard-generate" onclick="wizardGenerate('${field}','${escapeHtml(entityName)}')" id="wizard-gen-btn" style="display:none;">⚡ Generate & Add</button>
                </div>
            </div>
        </div>
    `;
    
    popover.classList.add('active');
    document.getElementById('wizard-backdrop').classList.add('active');
    updateWizardNavButtons();
}

function renderWizardStep(wizard, stepIdx) {
    const step = wizard.steps[stepIdx];
    const isResearchStep = (_wizardCurrentField === 'sameAs' && stepIdx === 0);
    const entityNameForResearch = _wizardEntityName || '';
    return `
        <div class="wizard-step-content">
            <h4 class="wizard-step-title">${step.title}</h4>
            <p class="wizard-step-instruction">${step.instruction}</p>
            ${isResearchStep ? `
            <div class="research-name-section" style="margin-bottom:14px;padding:12px;background:rgba(59,130,246,0.08);border-radius:8px;border:1px solid rgba(59,130,246,0.15);">
                <label style="display:block;font-size:0.72rem;font-weight:700;color:#60A5FA;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Search Business Name</label>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="text" id="research-name-input" value="${escapeHtml(entityNameForResearch)}" placeholder="Enter business name to search..." 
                           style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px 12px;color:#f0f4ff;font-size:0.85rem;">
                    <button class="btn-wizard-research" onclick="researchSameAs(document.getElementById('research-name-input').value)" id="research-btn" style="width:auto;white-space:nowrap;">
                        🔍 Search
                    </button>
                </div>
                <p style="font-size:0.7rem;color:#6b7a99;margin:6px 0 0;">Tip: Try a shorter name or remove extra words for better results</p>
            </div>
            <div id="research-results-panel"></div>
            ` : ''}
            <div class="wizard-fields">
                ${(() => {
                    // Group fields by their 'group' property
                    let html = '';
                    let currentGroup = null;
                    step.fields.forEach(f => {
                        if (f.group && f.group !== currentGroup) {
                            if (currentGroup) html += '</div>'; // close previous group
                            currentGroup = f.group;
                            html += `<div class="wizard-field-group" style="margin-bottom:16px;">
                                <div class="wizard-group-header" style="font-size:0.72rem;font-weight:700;color:#F97316;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid rgba(249,115,22,0.2);">${currentGroup}</div>`;
                        }
                        // Auto-fill mapping: wizard field id → autoScanData key
                        const autoFillMap = {
                            // sameAs wizard
                            'sa-facebook': 'fbUrl', 'sa-twitter': 'twUrl', 'sa-linkedin': 'liUrl',
                            'sa-youtube': 'ytUrl', 'sa-instagram': 'igUrl', 'sa-yelp': 'yelpUrl',
                            'sa-wikipedia': 'wikiUrl', 'sa-wikidata': 'wikidataUrl',
                            // founder/person wizard
                            'fp-name': 'personName', 'fp-title': 'personTitle',
                            'fp-email': 'email', 'fp-linkedin': 'personLinkedIn', 'fp-wikipedia': 'personWiki',
                            // potentialAction wizard
                            'pa-contact': 'contactUrl', 'pa-phone': 'phone', 'pa-booking': 'bookingUrl',
                            // areaServed wizard
                            'area-primary-city': 'areaCity', 'area-primary-state': 'areaState',
                            // foundingDate wizard (entity expansion)
                            'fd-year': 'foundingDate', 'fd-city': 'addressCity', 'fd-state': 'addressState',
                            // numberOfEmployees wizard (entity expansion)
                            'ne-count': 'numEmployees', 'ne-min': 'numEmployees', 'ne-max': 'numEmployees',
                            // aggregateRating wizards
                            'ar-rating': 'ratingValue', 'ar-count': 'reviewCount',
                            'art-value': 'ratingValue', 'art-count': 'reviewCount',
                            // knowsAbout wizard
                            'ka-topic1': (d) => d.services[0]||'', 'ka-topic2': (d) => d.services[1]||'',
                            'ka-topic3': (d) => d.services[2]||'', 'ka-topic4': (d) => d.services[3]||'',
                            'ka-topic5': (d) => d.services[4]||'',
                            // serviceNodes wizard (entity expansion)
                            'sn-name1': (d) => d.services[0]||'', 'sn-name2': (d) => d.services[1]||'',
                            'sn-name3': (d) => d.services[2]||'', 'sn-name4': (d) => d.services[3]||'',
                            'sn-city': 'areaCity', 'sn-state': 'areaState',
                            // practitionerPerson wizard (entity expansion)
                            'pp-name': 'personName', 'pp-title': 'personTitle',
                            'pp-linkedin': 'liUrl', 'pp-wikipedia': 'personWiki',
                            // branchRelationship wizard
                            'br-phone1': 'phone', 'br-phone2': 'phone',
                            // org fields
                            'org-name': 'orgName', 'org-url': 'url',
                            'org-phone': 'phone', 'org-email': 'email'
                        };
                        const scanData = _wizardAutoScanData || {};
                        const mappedKey = autoFillMap[f.id];
                        const autoVal = mappedKey
                            ? (typeof mappedKey === 'function' ? mappedKey(scanData) : (scanData[mappedKey] || ''))
                            : '';
                        const isAutoFilled = autoVal !== '';
                        html += `
                            <div class="form-group">
                                <label class="form-label">${f.label}${isAutoFilled ? ' <span class="wizard-autofill-badge">🔍 Auto-scanned</span>' : ''}</label>
                                <input type="${f.type||'text'}" id="${f.id}" class="form-input wizard-field-input${isAutoFilled ? ' wizard-autofilled' : ''}" 
                                       placeholder="${f.placeholder||''}" 
                                       value="${escapeHtml(autoVal)}"
                                       style="background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:6px;padding:8px 12px;width:100%;color:var(--text-primary);" />
                            </div>`;
                    });
                    if (currentGroup) html += '</div>';
                    return html;
                })()}
            </div>
        </div>
    `;
}

function updateWizardNavButtons() {
    const prevBtn = document.getElementById('wizard-prev-btn');
    const nextBtn = document.getElementById('wizard-next-btn');
    const genBtn = document.getElementById('wizard-gen-btn');
    if (!prevBtn) return;
    const isLast = _wizardCurrentStep >= _wizardSteps.length - 1;
    prevBtn.style.display = _wizardCurrentStep > 0 ? 'inline-flex' : 'none';
    nextBtn.style.display = isLast ? 'none' : 'inline-flex';
    genBtn.style.display = isLast ? 'inline-flex' : 'none';
    // Update tab active state
    document.querySelectorAll('.wizard-step-tab').forEach((t,i) => t.classList.toggle('active', i === _wizardCurrentStep));
}

function goToWizardStep(idx) {
    const wizard = SUGGESTION_WIZARDS[_wizardCurrentField];
    if (!wizard) return;
    _wizardCurrentStep = idx;
    const wizardBody = document.getElementById('wizard-body');
    if (wizardBody) wizardBody.innerHTML = renderWizardStep(wizard, idx);
    updateWizardNavButtons();
}

function wizardNext() {
    if (_wizardCurrentStep < _wizardSteps.length - 1) {
        goToWizardStep(_wizardCurrentStep + 1);
    }
}
function wizardPrev() {
    if (_wizardCurrentStep > 0) {
        goToWizardStep(_wizardCurrentStep - 1);
    }
}

function closeSuggestionWizard() {
    const popover = document.getElementById('suggestion-wizard-popover');
    const backdrop = document.getElementById('wizard-backdrop');
    if (popover) popover.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
}

// ────────────────────────────────────────────────────────────────────────────────
//  SETTINGS MODAL
// ────────────────────────────────────────────────────────────────────────────────
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('active');
        loadSettings();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');
}

function loadSettings() {
    const serpapiKey = localStorage.getItem('serpapi_key') || '';
    const openaiKey = localStorage.getItem('openai_key') || '';
    const crosscheck = localStorage.getItem('crosscheck_schema') !== 'false'; // default true
    const minSameAs = localStorage.getItem('min_sameas_links') || '5';
    
    const serpapiInput = document.getElementById('serpapi-key-input');
    const openaiInput = document.getElementById('openai-key-input');
    const crosscheckInput = document.getElementById('settings-crosscheck-schema');
    const minSameAsInput = document.getElementById('settings-min-sameas');
    
    if (serpapiInput) serpapiInput.value = serpapiKey;
    if (openaiInput) openaiInput.value = openaiKey;
    if (crosscheckInput) crosscheckInput.checked = crosscheck;
    if (minSameAsInput) minSameAsInput.value = minSameAs;
}

function saveSettings() {
    const serpapiKey = document.getElementById('serpapi-key-input')?.value || '';
    const openaiKey = document.getElementById('openai-key-input')?.value || '';
    const crosscheck = document.getElementById('settings-crosscheck-schema')?.checked ?? true;
    const minSameAs = document.getElementById('settings-min-sameas')?.value || '5';
    
    localStorage.setItem('serpapi_key', serpapiKey);
    localStorage.setItem('openai_key', openaiKey);
    localStorage.setItem('crosscheck_schema', crosscheck.toString());
    localStorage.setItem('min_sameas_links', minSameAs);
    
    closeSettingsModal();
    
    // Show success toast
    showToast('Settings saved successfully!', 'success');
}

function toggleApiKeyVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-' + type;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        font-size: 0.85rem;
        z-index: 100000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SAME-AS RESEARCH ENGINE
//  Scans the target website HTML and does web searches to find social profiles
// ─────────────────────────────────────────────────────────────────────────────
// Search with SerpAPI (preferred when API key available)
async function searchWithSerpAPI(query) {
    const apiKey = localStorage.getItem('serpapi_key');
    if (!apiKey) return null;
    
    try {
        // Use CORS proxy for browser-based requests
        const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`;
        const corsProxies = [
            `https://corsproxy.io/?${encodeURIComponent(serpUrl)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(serpUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(serpUrl)}`
        ];
        
        for (const proxyUrl of corsProxies) {
            try {
                const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
                if (response.ok) {
                    const text = await response.text();
                    // Handle JSON response from allorigins wrapper
                    let data;
                    if (text.startsWith('{') && text.includes('"contents"')) {
                        const wrapped = JSON.parse(text);
                        data = JSON.parse(wrapped.contents || wrapped.body || text);
                    } else {
                        data = JSON.parse(text);
                    }
                    return data;
                }
            } catch(e) { continue; }
        }
        return null;
    } catch(e) {
        console.warn('SerpAPI error:', e);
        return null;
    }
}

// Extract relevant URLs from SerpAPI results
function extractUrlsFromSerpAPI(data, domainPattern) {
    if (!data || !data.organic_results) return [];
    
    const urls = [];
    for (const result of data.organic_results) {
        if (result.link && domainPattern.test(result.link)) {
            urls.push({
                url: result.link,
                title: result.title || '',
                snippet: result.snippet || ''
            });
        }
    }
    return urls;
}

// Cross-check found URLs against existing schema
function filterExistingUrls(found, existingSameAs) {
    if (!existingSameAs || !Array.isArray(existingSameAs)) return found;
    
    const existingUrls = existingSameAs.map(url => {
        try {
            return new URL(url.replace(/\/$/, '')).href.toLowerCase();
        } catch(e) {
            return url.toLowerCase();
        }
    });
    
    const filtered = {};
    for (const [id, data] of Object.entries(found)) {
        try {
            const foundUrl = new URL(data.url.replace(/\/$/, '')).href.toLowerCase();
            if (!existingUrls.includes(foundUrl)) {
                filtered[id] = data;
            }
        } catch(e) {
            // Keep invalid URLs as-is
            filtered[id] = data;
        }
    }
    return filtered;
}

async function researchSameAs(entityName) {
    const btn = document.getElementById('research-btn');
    const panel = document.getElementById('research-results-panel');
    if (!panel) return;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> Researching...';
    }

    panel.innerHTML = `<div class="wizard-research-badge">🔍 Scanning website & web for profiles...</div>`;

    const url = window._currentEnhancedURL || '';
    const found = {};

    // --- Step 1: Scan target website HTML for social links ---
    if (url) {
        try {
            const proxies = [
                `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
                `https://corsproxy.io/?${encodeURIComponent(url)}`
            ];
            let html = null;
            for (const proxy of proxies) {
                try {
                    const r = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
                    if (r.ok) {
                        const j = await r.json().catch(() => null);
                        html = j ? (j.contents || j.body || '') : await r.text();
                        if (html && html.length > 500) break;
                    }
                } catch(e) { continue; }
            }
            if (html) {
                // Extract social profile links from HTML
                const socialPatterns = [
                    { id: 'sa-facebook',   re: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9._\-\/]+/gi,   label: 'Facebook' },
                    { id: 'sa-twitter',    re: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/gi,   label: 'Twitter/X' },
                    { id: 'sa-linkedin',   re: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9._\-]+/gi, label: 'LinkedIn' },
                    { id: 'sa-youtube',    re: /https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/|@|user\/)[A-Za-z0-9._\-@]+/gi, label: 'YouTube' },
                    { id: 'sa-instagram',  re: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]+/gi,       label: 'Instagram' },
                    { id: 'sa-yelp',       re: /https?:\/\/(?:www\.)?yelp\.com\/biz\/[A-Za-z0-9._\-]+/gi,    label: 'Yelp' },
                    { id: 'sa-gmb',        re: /https?:\/\/(?:maps\.google\.com|g\.page|goo\.gl\/maps)\/[^\s"'<>]+/gi, label: 'Google Maps' },
                    { id: 'sa-bbb',        re: /https?:\/\/(?:www\.)?bbb\.org\/[^\s"'<>]+/gi,                 label: 'BBB' }
                ];
                for (const pat of socialPatterns) {
                    const matches = [...new Set((html.match(pat.re) || [])
                        .map(u => u.replace(/['")\]>]+$/, '').trim())
                        .filter(u => u.length > 15 && !u.includes('intent') && !u.includes('share') && !u.includes('sharer'))
                    )];
                    if (matches.length) found[pat.id] = { url: matches[0], label: pat.label, source: 'website' };
                }
            }
        } catch(e) { console.warn('Website scan error:', e); }
    }

    // --- Step 2: Web search for social profiles ---
    // Check if SerpAPI is configured
    const serpapiKey = localStorage.getItem('serpapi_key');
    const crossCheckSchema = localStorage.getItem('crosscheck_schema') !== 'false';
    
    // Get existing sameAs from schema for cross-checking
    let existingSameAs = [];
    if (crossCheckSchema && window._currentSchemaJSON) {
        const graph = window._currentSchemaJSON['@graph'] || [];
        const primaryOrg = graph.find(e => e['@type'] === 'Organization') || graph[0] || {};
        existingSameAs = Array.isArray(primaryOrg.sameAs) ? primaryOrg.sameAs : (primaryOrg.sameAs ? [primaryOrg.sameAs] : []);
    }
    
    // Use flexible search (no exact match quotes) for better results
    const searchName = entityName || 'this business';
    // Extract shorter name for searches (first 2-3 words usually work best)
    const shortName = searchName.split(/\s+/).slice(0, 3).join(' ').replace(/[^a-zA-Z0-9\s]/g, '').trim() || searchName;
    const searchQueries = [
        // Strict URL patterns - only match specific profile/business page formats
        { 
            q: `${shortName} site:facebook.com`, 
            id: 'sa-facebook', 
            label: 'Facebook', 
            pattern: /^https?:\/\/(www\.)?facebook\.com\/[A-Za-z0-9][A-Za-z0-9.\-]{4,}$/i,
            validate: (url) => !url.includes('/posts/') && !url.includes('/photos/') && !url.includes('/videos/') && !url.includes('/events/') && !url.includes('/groups/') && !url.includes('/sharer') && !url.includes('/dialog/')
        },
        { 
            q: `${shortName} site:linkedin.com/company`, 
            id: 'sa-linkedin', 
            label: 'LinkedIn', 
            pattern: /^https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[A-Za-z0-9][A-Za-z0-9\-]{2,}\/?$/i,
            validate: (url) => !url.includes('/posts/') && !url.includes('/jobs/') && !url.includes('/pulse/')
        },
        { 
            q: `${shortName} site:twitter.com OR ${shortName} site:x.com`, 
            id: 'sa-twitter', 
            label: 'Twitter/X', 
            pattern: /^https?:\/\/(www\.)?(twitter|x)\.com\/[A-Za-z0-9_]{3,15}$/i,
            validate: (url) => !url.includes('/status/') && !url.includes('/statuses/')
        },
        { 
            q: `${shortName} site:youtube.com channel`, 
            id: 'sa-youtube', 
            label: 'YouTube', 
            pattern: /^https?:\/\/(www\.)?youtube\.com\/(channel\/[A-Za-z0-9_\-]+|@[A-Za-z0-9_\-]{3,})$/i,
            validate: (url) => !url.includes('/watch?v=') && !url.includes('/playlist')
        },
        { 
            q: `${shortName} site:instagram.com`, 
            id: 'sa-instagram', 
            label: 'Instagram', 
            pattern: /^https?:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]{3,30}$/i,
            validate: (url) => !url.includes('/p/') && !url.includes('/reel/') && !url.includes('/explore/')
        },
        { 
            q: `${shortName} site:yelp.com/biz`, 
            id: 'sa-yelp', 
            label: 'Yelp', 
            pattern: /^https?:\/\/(www\.)?yelp\.com\/biz\/[A-Za-z0-9_\-]+$/i,
            validate: () => true
        },
        { 
            q: `${shortName} site:bbb.org`, 
            id: 'sa-bbb', 
            label: 'BBB', 
            pattern: /^https?:\/\/(www\.)?bbb\.org\/[A-Za-z]{2}\/[A-Za-z0-9_\-]+\/profile\/[A-Za-z0-9_\-]+$/i,
            validate: () => true
        },
        { 
            q: `${shortName} site:wikipedia.org`, 
            id: 'sa-wikipedia', 
            label: 'Wikipedia', 
            pattern: /^https?:\/\/[a-z]+\.wikipedia\.org\/wiki\/[A-Za-z0-9_\-]+$/i,
            validate: () => true
        }
    ];
    
    // Use SerpAPI if configured, otherwise fall back to DuckDuckGo
    if (serpapiKey) {
        // SerpAPI search - much better results
        for (const sq of searchQueries) {
            if (found[sq.id]) continue;
            
            const data = await searchWithSerpAPI(sq.q);
            if (data && data.organic_results && data.organic_results.length > 0) {
                for (const result of data.organic_results) {
                    if (result.link && sq.pattern.test(result.link) && sq.validate(result.link)) {
                        found[sq.id] = { 
                            url: result.link, 
                            label: sq.label, 
                            source: 'SerpAPI',
                            title: result.title || ''
                        };
                        break;
                    }
                }
            }
        }
    } else {
        // Fallback: Use multiple CORS proxies with DuckDuckGo HTML
        for (const sq of searchQueries) {
            if (found[sq.id]) continue; // already found from website scan
            
            const searchUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(sq.q);
            const proxies = [
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://api.allorigins.win/get?url=',
                'https://corsproxy.io/?'
            ];
            
            let html = '';
            for (const proxy of proxies) {
                try {
                    const fetchUrl = proxy + encodeURIComponent(searchUrl);
                    const r = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) });
                    if (r.ok) {
                        const text = await r.text();
                        // Handle JSON response from allorigins
                        if (text.startsWith('{')) {
                            try { html = JSON.parse(text).contents || ''; } catch(e) { html = text; }
                        } else {
                            html = text;
                        }
                        if (html && html.length > 500) break;
                    }
                } catch(e) { continue; }
            }
            
            if (!html) continue;
            
            // DuckDuckGo HTML uses redirect URLs like: //duckduckgo.com/l/?uddg=https%3A%2F%2F...
            const redirectMatch = html.match(/uddg=([^&"'>]+)/g);
            if (redirectMatch) {
                for (const rm of redirectMatch) {
                    try {
                        const encodedUrl = rm.replace('uddg=', '');
                        const decodedUrl = decodeURIComponent(encodedUrl);
                        // Check if this URL matches our target domain
                        const pattern = sq.pattern;
                        const cleanUrl = decodedUrl.split('&')[0];
                        if (pattern && pattern.test(cleanUrl) && sq.validate(cleanUrl)) {
                            found[sq.id] = { url: cleanUrl, label: sq.label, source: 'web search' };
                            break;
                        }
                    } catch(e) { /* skip decode errors */ }
                }
            }
        }
    }

    // --- Step 3: Cross-check against existing schema and render results ---
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🔍 Re-Research Profiles';
    }
    
    // Filter out URLs that already exist in schema
    if (crossCheckSchema && existingSameAs.length > 0) {
        found = filterExistingUrls(found, existingSameAs);
    }

    const foundEntries = Object.entries(found);
    if (!foundEntries.length) {
        panel.innerHTML = `<div class="wizard-research-results"><div class="wizard-research-title">Research Results</div><p style="color:#6b7a99;font-size:0.8rem;padding:8px 0;">No new profiles found (existing ones may already be in schema). Please enter URLs manually below.</p></div>`;
        return;
    }

    // Don't auto-fill - let user click Apply on individual results
    // Render results panel
    panel.innerHTML = `
        <div class="wizard-research-results">
            <div class="wizard-research-title">✅ Found ${foundEntries.length} profile${foundEntries.length !== 1 ? 's' : ''} — click Apply to add</div>
            ${foundEntries.map(([id, data]) => `
                <div class="wizard-found-item">
                    <div class="wizard-found-check">✓</div>
                    <div class="wizard-found-label">${data.label}</div>
                    <div class="wizard-found-value" title="${data.url}" onclick="applyResearchResult('${id}','${data.url.replace(/'/g,"\\'")}')">
                        ${data.url.length > 50 ? data.url.substring(0, 50) + '…' : data.url}
                    </div>
                    <span style="font-size:0.65rem;color:#3d4a63;flex-shrink:0;">${data.source}</span>
                    <button class="wizard-apply-btn" onclick="applyResearchResult('${id}','${data.url.replace(/'/g,"\\'")}')">Apply</button>
                </div>
            `).join('')}
        </div>
    `;
}

function applyResearchResult(fieldId, url) {
    const el = document.getElementById(fieldId);
    if (el) {
        el.value = url;
        el.style.borderColor = 'rgba(16,185,129,0.6)';
        // Scroll to the field
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        // Flash effect
        el.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.3)';
        setTimeout(() => el.style.boxShadow = '', 2000);
        showToast(`Applied URL to ${fieldId.replace('sa-', '').replace(/-/g, ' ')}`, 'success');
    } else {
        // Field doesn't exist - show error
        showToast(`Field ${fieldId} not found on this page`, 'error');
    }
}


function wizardGenerate(field, entityName) {
    const wizard = SUGGESTION_WIZARDS[field];
    if (!wizard) return;
    
    // Collect ALL field values from all steps (traverse DOM for any that exist)
    const vals = {};
    wizard.steps.forEach(step => {
        step.fields.forEach(f => {
            const el = document.getElementById(f.id);
            if (el && el.value.trim()) vals[f.id] = el.value.trim();
        });
    });
    
    // Build the schema fragment based on the field type
    let newSchemaProps = {};
    const enhancedResult = window._currentEnhancedResult;
    const baseUrl = (window._currentEnhancedURL||'https://example.com').replace(/\/+$/,'');
    const orgTitle = window._currentEnhancedTitle || '';
    
    if (field === 'sameAs') {
        const links = [];
        ['sa-facebook','sa-twitter','sa-linkedin','sa-youtube','sa-instagram','sa-gmb','sa-yelp','sa-bbb','sa-crunchbase','sa-foursquare','sa-wikipedia','sa-wikidata','sa-press1','sa-press2','sa-press3']
            .forEach(id => { if(vals[id]) links.push(vals[id]); });
        if (links.length) newSchemaProps.sameAs = links;
        if (vals['sa-wikipedia'] || vals['sa-wikidata']) {
            showToast(`✅ Added ${links.length} sameAs links!`, 'success');
        }
    }
    
    else if (field === 'knowsAbout') {
        const topics = [];
        [1,2,3,4,5].forEach(n => {
            const topic = vals[`ka-topic${n}`];
            const wiki = vals[`ka-wiki${n}`];
            const wd = vals[`ka-wd${n}`];
            
            // Build the knowsAbout entity with all available references
            if (topic || wiki || wd) {
                const entity = {"@type": "Thing"};
                if (topic) entity.name = topic;
                
                // Build sameAs array with Wikipedia and Wikidata
                const sameAs = [];
                if (wiki) sameAs.push(wiki);
                
                // Wikidata Q-code - convert to full URL or use as @id
                if (wd) {
                    const qid = wd.toUpperCase().startsWith('Q') ? wd : 'Q' + wd;
                    sameAs.push(`https://www.wikidata.org/wiki/${qid}`);
                }
                
                if (sameAs.length === 1) entity.sameAs = sameAs[0];
                else if (sameAs.length > 1) entity.sameAs = sameAs;
                
                topics.push(entity);
            }
        });
        if (topics.length) newSchemaProps.knowsAbout = topics;
    }
    
    else if (field === 'areaServed') {
        const areas = [];
        if (vals['area-primary-city']) {
            const primaryArea = {"@type":"City","name":vals['area-primary-city']};
            if (vals['area-primary-state']) primaryArea.containedInPlace = {"@type":"State","name":vals['area-primary-state']};
            if (vals['area-lat'] && vals['area-lng'] && vals['area-radius']) {
                primaryArea.geo = {"@type":"GeoCircle","geoMidpoint":{"@type":"GeoCoordinates","latitude":parseFloat(vals['area-lat']),"longitude":parseFloat(vals['area-lng'])},"geoRadius":parseFloat(vals['area-radius'])*1609.34};
            }
            areas.push(primaryArea);
        }
        [2,3,4,5,6].forEach(n => { if(vals[`area-city${n}`]) areas.push({"@type":"City","name":vals[`area-city${n}`]}); });
        if (areas.length) newSchemaProps.areaServed = areas;
    }
    
    else if (field === 'potentialAction') {
        const actions = [];
        if (vals['pa-contact']) actions.push({"@type":"CommunicateAction","name":"Contact Us","target":{"@type":"EntryPoint","urlTemplate":vals['pa-contact'],"actionPlatform":["http://schema.org/DesktopWebPlatform","http://schema.org/MobileWebPlatform"]}});
        if (vals['pa-phone']) actions.push({"@type":"CommunicateAction","name":"Call Us","target":{"@type":"EntryPoint","urlTemplate":"tel:"+vals['pa-phone'].replace(/[^0-9+]/g,'')}});
        if (vals['pa-booking']) actions.push({"@type":"ReserveAction","name":"Book Appointment","target":{"@type":"EntryPoint","urlTemplate":vals['pa-booking']}});
        if (vals['pa-quote']) actions.push({"@type":"RequestAction","name":"Get a Quote","target":{"@type":"EntryPoint","urlTemplate":vals['pa-quote']}});
        if (vals['pa-order']) actions.push({"@type":"BuyAction","name":"Order Now","target":{"@type":"EntryPoint","urlTemplate":vals['pa-order']}});
        if (actions.length) newSchemaProps.potentialAction = actions.length === 1 ? actions[0] : actions;
    }
    
    else if (field === 'founder') {
        const newPersons = [];
        [[1,''],[2,'2']].forEach(([n,suffix]) => {
            const prefix = suffix ? 'fp2' : 'fp';
            const name = vals[`${prefix}-name`];
            if (!name) return;
            const personId = baseUrl + '/#person-' + name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
            const person = {"@type":"Person","@id":personId,"name":name};
            if (vals[`${prefix}-title`]) person.jobTitle = vals[`${prefix}-title`];
            if (vals[`${prefix}-email`]) person.email = vals[`${prefix}-email`];
            const sameas = [];
            if (vals[`${prefix}-wikipedia`]) sameas.push(vals[`${prefix}-wikipedia`]);
            if (vals[`${prefix}-linkedin`]) sameas.push(vals[`${prefix}-linkedin`]);
            if (sameas.length) person.sameAs = sameas;
            if (vals[`${prefix}-education`]) person.alumniOf = {"@type":"EducationalOrganization","name":vals[`${prefix}-education`]};
            if (vals[`${prefix}-awards`]) person.award = vals[`${prefix}-awards`].split(',').map(a=>a.trim());
            if (vals[`${prefix}-affiliations`]) person.affiliation = vals[`${prefix}-affiliations`].split(',').map(a=>({"@type":"Organization","name":a.trim()}));
            person.__isNew__ = true;
            newPersons.push(person);
            // Add to graph
            if (enhancedResult && enhancedResult['@graph']) {
                enhancedResult['@graph'].push(person);
            }
        });
        if (newPersons.length) {
            const founderRefs = newPersons.map(p => ({"@id":p['@id']}));
            newSchemaProps.founder = founderRefs.length === 1 ? founderRefs[0] : founderRefs;
        }
    }
    
    else if (field === 'hasOfferCatalog') {
        const items = [];
        const newServices = [];
        [1,2,3,4,5,6].forEach(n => {
            const name = vals[`oc-svc${n}`];
            if (!name) return;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
            const svcId = baseUrl + '/#service-' + slug;
            const svc = {"@type":"Service","@id":svcId,"name":name,"provider":{"@id":baseUrl+'/#organization'}};
            if (vals[`oc-url${n}`]) { svc.url = vals[`oc-url${n}`]; svc.mainEntityOfPage = {"@type":"WebPage","@id":vals[`oc-url${n}`]}; }
            svc.__isNew__ = true;
            newServices.push(svc);
            items.push({"@id":svcId});
            if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(svc);
        });
        if (items.length) newSchemaProps.hasOfferCatalog = {"@type":"OfferCatalog","name":"Services","itemListElement":items};
    }
    
    else if (field === 'aggregateRating') {
        if (vals['ar-value'] && vals['ar-count']) {
            newSchemaProps.aggregateRating = {
                "@type":"AggregateRating",
                "ratingValue":parseFloat(vals['ar-value']),
                "bestRating":parseFloat(vals['ar-best']||'5'),
                "reviewCount":parseInt(vals['ar-count']),
                "ratingCount":parseInt(vals['ar-count'])
            };
        }
    }

    else if (field === 'mentions') {
        const mentions = [];
        // Process URL-based mentions
        ['ment-competitor1', 'ment-competitor2', 'ment-partner1', 'ment-partner2', 'ment-tool1', 'ment-tool2', 'ment-concept1', 'ment-concept2'].forEach(key => {
            const url = vals[key];
            if (!url) return;
            // Determine the type based on the key
            const isCompetitor = key.includes('competitor');
            const isPartner = key.includes('partner');
            const isTool = key.includes('tool');
            const isConcept = key.includes('concept');
            
            // Extract name from URL or Wikipedia title
            let name = '';
            if (url.includes('wikipedia.org/wiki/')) {
                name = url.split('/wiki/').pop().replace(/_/g, ' ');
            } else if (url.includes('wikidata.org/wiki/Q')) {
                // Wikidata URL - use as @id reference
                mentions.push({"@id": url});
                return;
            } else {
                try { name = new URL(url).hostname.replace('www.', ''); } catch(e) { name = url; }
            }
            
            const mention = {"@type": "Thing", "name": name, "sameAs": url};
            mentions.push(mention);
        });
        
        // Process Wikidata IDs
        ['ment-wd1', 'ment-wd2', 'ment-wd3'].forEach(key => {
            const qid = vals[key];
            if (!qid) return;
            const cleanQid = qid.toUpperCase().startsWith('Q') ? qid : 'Q' + qid;
            mentions.push({"@id": `https://www.wikidata.org/wiki/${cleanQid}`});
        });
        
        if (mentions.length) newSchemaProps.mentions = mentions;
    }

    else if (field === 'addBlogPosting') {
        if (!vals['bp-headline']) { showToast('Please enter an article headline', 'warning'); return; }
        const urlObj2 = (() => { try { return new URL(vals['bp-url'] || baseUrl); } catch(e) { return null; } })();
        const articleId = (vals['bp-url'] || baseUrl) + '#blogposting';
        const article = {
            "@type": "BlogPosting",
            "@id": articleId,
            "headline": vals['bp-headline'],
            "__isNew__": true
        };
        if (vals['bp-description']) article.description = vals['bp-description'];
        if (vals['bp-url']) { article.url = vals['bp-url']; article.mainEntityOfPage = {"@type":"WebPage","@id":vals['bp-url']}; }
        if (vals['bp-date-pub']) article.datePublished = vals['bp-date-pub'];
        if (vals['bp-date-mod']) article.dateModified = vals['bp-date-mod'];
        if (vals['bp-wordcount']) article.wordCount = parseInt(vals['bp-wordcount']);
        if (vals['bp-keywords']) article.keywords = vals['bp-keywords'].split(',').map(k=>k.trim());
        if (vals['bp-author-name']) {
            const authorId = baseUrl + '/#author-' + vals['bp-author-name'].toLowerCase().replace(/[^a-z0-9]+/g,'-');
            const author = {"@type":"Person","@id":authorId,"name":vals['bp-author-name']};
            const sameAs = [];
            if (vals['bp-author-twitter']) sameAs.push(vals['bp-author-twitter']);
            if (vals['bp-author-linkedin']) sameAs.push(vals['bp-author-linkedin']);
            if (sameAs.length) author.sameAs = sameAs;
            if (vals['bp-author-url']) author.url = vals['bp-author-url'];
            article.author = author;
        }
        if (vals['bp-image-url']) {
            const img = {"@type":"ImageObject","url":vals['bp-image-url']};
            if (vals['bp-image-width']) img.width = parseInt(vals['bp-image-width']);
            if (vals['bp-image-height']) img.height = parseInt(vals['bp-image-height']);
            article.image = img;
        }
        // Add publisher ref if org exists
        const orgRef = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Organization','LocalBusiness','ProfessionalService'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (orgRef && orgRef['@id']) article.publisher = {"@id": orgRef['@id']};
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(article);
        closeSuggestionWizard();
        showToast('✅ BlogPosting schema added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    else if (field === 'articleAuthor') {
        if (!vals['aa-name']) { showToast('Please enter the author name', 'warning'); return; }
        const authorId = baseUrl + '/#author-' + vals['aa-name'].toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const author = {"@type":"Person","@id":authorId,"name":vals['aa-name'],"__isNew__":true};
        if (vals['aa-url']) author.url = vals['aa-url'];
        if (vals['aa-description']) author.description = vals['aa-description'];
        if (vals['aa-image']) author.image = {"@type":"ImageObject","url":vals['aa-image']};
        const sameAs = [];
        if (vals['aa-twitter']) sameAs.push(vals['aa-twitter']);
        if (vals['aa-linkedin']) sameAs.push(vals['aa-linkedin']);
        if (vals['aa-wikipedia']) sameAs.push(vals['aa-wikipedia']);
        if (vals['aa-website']) sameAs.push(vals['aa-website']);
        if (vals['aa-youtube']) sameAs.push(vals['aa-youtube']);
        if (sameAs.length) author.sameAs = sameAs;
        // Add to graph and set on article entity
        if (enhancedResult && enhancedResult['@graph']) {
            enhancedResult['@graph'].push(author);
            const articleEntity = enhancedResult['@graph'].find(e => ['Article','BlogPosting','NewsArticle'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
            if (articleEntity) { articleEntity.author = {"@id": authorId}; articleEntity.__addedFields = (articleEntity.__addedFields||[]); articleEntity.__addedFields.push('author'); }
        }
        closeSuggestionWizard();
        showToast('✅ Author Person schema added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    else if (field === 'articleDate') {
        if (!vals['ad-published']) { showToast('Please enter the publish date', 'warning'); return; }
        const articleEntity = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Article','BlogPosting','NewsArticle'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (articleEntity) {
            if (vals['ad-published']) { articleEntity.datePublished = vals['ad-published']; articleEntity.__addedFields = (articleEntity.__addedFields||[]); articleEntity.__addedFields.push('datePublished'); }
            if (vals['ad-modified']) { articleEntity.dateModified = vals['ad-modified']; articleEntity.__addedFields = (articleEntity.__addedFields||[]); articleEntity.__addedFields.push('dateModified'); }
            if (vals['ad-created']) { articleEntity.dateCreated = vals['ad-created']; }
        }
        closeSuggestionWizard();
        showToast('✅ Article dates added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    else if (field === 'articleImage') {
        if (!vals['ai-url']) { showToast('Please enter the image URL', 'warning'); return; }
        const img = {"@type":"ImageObject","url":vals['ai-url']};
        if (vals['ai-width']) img.width = parseInt(vals['ai-width']);
        if (vals['ai-height']) img.height = parseInt(vals['ai-height']);
        if (vals['ai-alt']) img.description = vals['ai-alt'];
        if (vals['ai-caption']) img.caption = vals['ai-caption'];
        const articleEntity = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Article','BlogPosting','NewsArticle'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (articleEntity) { articleEntity.image = img; articleEntity.__addedFields = (articleEntity.__addedFields||[]); articleEntity.__addedFields.push('image'); }
        closeSuggestionWizard();
        showToast('✅ Article image added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    else if (field === 'articlePublisher') {
        if (!vals['ap-name'] || !vals['ap-url']) { showToast('Please enter publisher name and URL', 'warning'); return; }
        const pubId = vals['ap-url'].replace(/\/+$/,'') + '/#organization';
        const publisher = {"@type":"Organization","@id":pubId,"name":vals['ap-name'],"url":vals['ap-url'],"__isNew__":true};
        if (vals['ap-logo']) {
            const logo = {"@type":"ImageObject","url":vals['ap-logo']};
            if (vals['ap-logo-width']) logo.width = parseInt(vals['ap-logo-width']);
            if (vals['ap-logo-height']) logo.height = parseInt(vals['ap-logo-height']);
            publisher.logo = logo;
        }
        const articleEntity = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Article','BlogPosting','NewsArticle'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (articleEntity) { articleEntity.publisher = {"@id": pubId}; articleEntity.__addedFields = (articleEntity.__addedFields||[]); articleEntity.__addedFields.push('publisher'); }
        if (enhancedResult && enhancedResult['@graph']) {
            const exists = enhancedResult['@graph'].find(e => e['@id'] === pubId);
            if (!exists) enhancedResult['@graph'].push(publisher);
        }
        closeSuggestionWizard();
        showToast('✅ Publisher Organization added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    else if (field === 'addBreadcrumb') {
        const items = [];
        [1,2,3,4].forEach(n => {
            const name = vals[`bc-${n}-name`];
            const url2 = vals[`bc-${n}-url`];
            if (name) {
                const item = {"@type":"ListItem","position":n,"name":name};
                if (url2) item.item = url2;
                items.push(item);
            }
        });
        if (items.length < 2) { showToast('Please enter at least 2 breadcrumb levels', 'warning'); return; }
        const breadcrumb = {"@type":"BreadcrumbList","@id":baseUrl+'/#breadcrumb',"itemListElement":items,"__isNew__":true};
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(breadcrumb);
        closeSuggestionWizard();
        showToast('✅ BreadcrumbList added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    else if (field === 'addHowTo') {
        if (!vals['ht-name']) { showToast('Please enter the HowTo title', 'warning'); return; }
        const steps2 = [];
        [1,2,3,4,5,6].forEach(n => {
            if (vals[`ht-s${n}`]) steps2.push({"@type":"HowToStep","position":n,"text":vals[`ht-s${n}`],"name":vals[`ht-s${n}`].substring(0,60)});
        });
        const howto = {"@type":"HowTo","@id":baseUrl+'/#howto',"name":vals['ht-name'],"__isNew__":true};
        if (vals['ht-description']) howto.description = vals['ht-description'];
        if (vals['ht-totaltime']) howto.totalTime = vals['ht-totaltime'];
        if (vals['ht-yield']) howto.yield = vals['ht-yield'];
        if (vals['ht-image']) howto.image = {"@type":"ImageObject","url":vals['ht-image']};
        if (steps2.length) howto.step = steps2;
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(howto);
        closeSuggestionWizard();
        showToast('✅ HowTo schema added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    else if (field === 'addFAQPage') {
        const mainEntity2 = [];
        [1,2,3,4,5].forEach(n => {
            const q = vals[`fq-q${n}`];
            const a = vals[`fq-a${n}`];
            if (q && a) mainEntity2.push({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}});
        });
        if (mainEntity2.length === 0) { showToast('Please enter at least one question and answer', 'warning'); return; }
        const faq = {"@type":"FAQPage","@id":baseUrl+'/#faqpage',"mainEntity":mainEntity2,"__isNew__":true};
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(faq);
        closeSuggestionWizard();
        showToast('✅ FAQPage schema added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    else if (field === 'addProduct') {
        if (!vals['pr-name']) { showToast('Please enter the product name', 'warning'); return; }
        const product = {"@type":"Product","@id":baseUrl+'/#product',"name":vals['pr-name'],"__isNew__":true};
        if (vals['pr-description']) product.description = vals['pr-description'];
        if (vals['pr-image']) product.image = {"@type":"ImageObject","url":vals['pr-image']};
        if (vals['pr-sku']) product.sku = vals['pr-sku'];
        if (vals['pr-brand']) product.brand = {"@type":"Brand","name":vals['pr-brand']};
        if (vals['pr-price']) {
            product.offers = {
                "@type":"Offer",
                "price": vals['pr-price'],
                "priceCurrency": vals['pr-currency'] || 'USD',
                "availability": "https://schema.org/" + (vals['pr-availability'] || 'InStock'),
                "itemCondition": "https://schema.org/" + (vals['pr-condition'] || 'NewCondition')
            };
            if (vals['pr-url']) product.offers.url = vals['pr-url'];
        }
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(product);
        closeSuggestionWizard();
        showToast('✅ Product schema added!', 'success');
        const enhancedJsonEl = document.getElementById('enhanced-json');
        if (enhancedJsonEl && enhancedResult) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
        _markSuggestionDone(field);
        return;
    }

    // ─── ENTITY EXPANSION WIZARD HANDLERS ─────────────────────────────────────

    else if (field === 'foundingDate') {
        if (!vals['fd-year']) { showToast('Please enter the founding year', 'warning'); return; }
        newSchemaProps.foundingDate = vals['fd-year'];
        if (vals['fd-city'] || vals['fd-state']) {
            newSchemaProps.foundingLocation = {"@type":"Place","name":(vals['fd-city']||'') + (vals['fd-state']?', '+vals['fd-state']:'')};
        }
    }

    else if (field === 'credentialTrust') {
        const awards = [1,2,3,4,5].map(n => vals[`ct-award${n}`]).filter(Boolean);
        if (awards.length) newSchemaProps.award = awards;
        const assocs = [];
        [1,2,3].forEach(n => {
            const name = vals[`ct-assoc${n}`];
            if (name) {
                const a = {"@type":"Organization","name":name};
                if (vals[`ct-assoc-url${n}`]) a.url = vals[`ct-assoc-url${n}`];
                assocs.push(a);
            }
        });
        if (assocs.length) newSchemaProps.memberOf = assocs;
    }

    else if (field === 'numberOfEmployees') {
        if (!vals['ne-count']) { showToast('Please enter the number of employees', 'warning'); return; }
        const empObj = {"@type":"QuantitativeValue","value":parseInt(vals['ne-count'])};
        if (vals['ne-min']) empObj.minValue = parseInt(vals['ne-min']);
        if (vals['ne-max']) empObj.maxValue = parseInt(vals['ne-max']);
        newSchemaProps.numberOfEmployees = empObj;
    }

    else if (field === 'aggregateRatingTrust') {
        if (!vals['art-value'] || !vals['art-count']) { showToast('Please enter rating value and review count', 'warning'); return; }
        newSchemaProps.aggregateRating = {
            "@type":"AggregateRating",
            "ratingValue": parseFloat(vals['art-value']),
            "bestRating": parseFloat(vals['art-best']||'5'),
            "reviewCount": parseInt(vals['art-count']),
            "ratingCount": parseInt(vals['art-count'])
        };
    }

    else if (field === 'branchRelationship') {
        if (!vals['br-name1']) { showToast('Please enter at least one branch name', 'warning'); return; }
        const branches = [];
        [1,2].forEach(n => {
            const name = vals[`br-name${n}`];
            if (!name) return;
            const branch = {"@type":"LocalBusiness","name":name,"__isNew__":true};
            if (vals[`br-addr${n}`]) branch.address = {"@type":"PostalAddress","streetAddress":vals[`br-addr${n}`]};
            if (vals[`br-phone${n}`]) branch.telephone = vals[`br-phone${n}`];
            branches.push(branch);
            if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(branch);
        });
        if (branches.length) newSchemaProps.department = branches.map(b => ({"@type":"LocalBusiness","name":b.name}));
    }

    else if (field === 'practitionerPerson') {
        if (!vals['pp-name']) { showToast('Please enter the practitioner name', 'warning'); return; }
        const personId = baseUrl + '/#person-' + vals['pp-name'].toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const person = {"@type":"Person","@id":personId,"name":vals['pp-name'],"__isNew__":true};
        if (vals['pp-title']) person.jobTitle = vals['pp-title'];
        if (vals['pp-specialty']) person.knowsAbout = [{"@type":"Thing","name":vals['pp-specialty']}];
        if (vals['pp-description']) person.description = vals['pp-description'];
        if (vals['pp-education']) person.alumniOf = {"@type":"EducationalOrganization","name":vals['pp-education']};
        if (vals['pp-license']) person.identifier = vals['pp-license'];
        const sameAs = [];
        if (vals['pp-linkedin']) sameAs.push(vals['pp-linkedin']);
        if (vals['pp-wikipedia']) sameAs.push(vals['pp-wikipedia']);
        if (vals['pp-website']) sameAs.push(vals['pp-website']);
        if (vals['pp-healthgrades']) sameAs.push(vals['pp-healthgrades']);
        if (vals['pp-hospital']) sameAs.push(vals['pp-hospital']);
        if (sameAs.length) person.sameAs = sameAs;
        const orgRef = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Organization','LocalBusiness','ProfessionalService','MedicalBusiness','LegalService'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (orgRef && orgRef['@id']) person.worksFor = {"@id": orgRef['@id']};
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(person);
        closeSuggestionWizard();
        showToast('✅ Practitioner Person schema added!', 'success');
        const enhancedJsonEl2 = document.getElementById('enhanced-json');
        if (enhancedJsonEl2 && enhancedResult) enhancedJsonEl2.innerHTML = buildDiffJSON(enhancedResult);
        _markExpansionDone(field);
        return;
    }

    else if (field === 'serviceNodes') {
        if (!vals['sn-name1']) { showToast('Please enter at least one service name', 'warning'); return; }
        const newServices = [];
        [1,2,3,4].forEach(n => {
            const name = vals[`sn-name${n}`];
            if (!name) return;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
            const svcId = baseUrl + '/#service-' + slug;
            const svc = {"@type":"Service","@id":svcId,"name":name,"__isNew__":true};
            if (vals[`sn-type${n}`]) svc.serviceType = vals[`sn-type${n}`];
            if (vals[`sn-url${n}`]) { svc.url = vals[`sn-url${n}`]; svc.mainEntityOfPage = {"@type":"WebPage","@id":vals[`sn-url${n}`]}; }
            const orgRef2 = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Organization','LocalBusiness','ProfessionalService'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
            if (orgRef2 && orgRef2['@id']) svc.provider = {"@id": orgRef2['@id']};
            // Area served
            if (vals['sn-city'] && vals['sn-state']) {
                const areas = [{"@type":"City","name":vals['sn-city'],"containedInPlace":{"@type":"State","name":vals['sn-state']}}];
                ['sn-area2','sn-area3','sn-area4'].forEach(k => { if(vals[k]) areas.push({"@type":"City","name":vals[k]}); });
                svc.areaServed = areas;
            }
            newServices.push(svc);
            if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(svc);
        });
        closeSuggestionWizard();
        showToast(`✅ ${newServices.length} Service node(s) added!`, 'success');
        const enhancedJsonEl3 = document.getElementById('enhanced-json');
        if (enhancedJsonEl3 && enhancedResult) enhancedJsonEl3.innerHTML = buildDiffJSON(enhancedResult);
        _markExpansionDone(field);
        return;
    }

    else if (field === 'medicalEntities') {
        if (!vals['me-name']) { showToast('Please enter the condition/treatment name', 'warning'); return; }
        const medType = vals['me-type'] || 'MedicalCondition';
        const medical = {"@type": medType,"name":vals['me-name'],"__isNew__":true};
        if (vals['me-description']) medical.description = vals['me-description'];
        if (vals['me-specialty']) medical.relevantSpecialty = {"@type":"MedicalSpecialty","name":vals['me-specialty']};
        const medSameAs = [];
        if (vals['me-wikipedia']) medSameAs.push(vals['me-wikipedia']);
        if (vals['me-wikidata']) { const q = vals['me-wikidata'].toUpperCase().startsWith('Q')?vals['me-wikidata']:'Q'+vals['me-wikidata']; medSameAs.push(`https://www.wikidata.org/wiki/${q}`); }
        if (medSameAs.length) medical.sameAs = medSameAs;
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(medical);
        closeSuggestionWizard();
        showToast('✅ Medical entity schema added!', 'success');
        const enhancedJsonEl4 = document.getElementById('enhanced-json');
        if (enhancedJsonEl4 && enhancedResult) enhancedJsonEl4.innerHTML = buildDiffJSON(enhancedResult);
        _markExpansionDone(field);
        return;
    }

    else if (field === 'videoObject') {
        if (!vals['vo-name'] || !vals['vo-thumbnail'] || !vals['vo-upload']) { showToast('Please enter video title, thumbnail URL, and upload date', 'warning'); return; }
        const video = {
            "@type":"VideoObject","@id":baseUrl+'/#video',"name":vals['vo-name'],
            "description":vals['vo-description']||vals['vo-name'],
            "thumbnailUrl":vals['vo-thumbnail'],"uploadDate":vals['vo-upload'],"__isNew__":true
        };
        if (vals['vo-duration']) video.duration = vals['vo-duration'];
        if (vals['vo-embed']) video.embedUrl = vals['vo-embed'];
        if (vals['vo-content']) video.contentUrl = vals['vo-content'];
        if (vals['vo-width'] && vals['vo-height']) video.videoFrameSize = vals['vo-width']+'x'+vals['vo-height'];
        const orgRef3 = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Organization','LocalBusiness','ProfessionalService'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (orgRef3 && orgRef3['@id']) video.publisher = {"@id": orgRef3['@id']};
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(video);
        closeSuggestionWizard();
        showToast('✅ VideoObject schema added!', 'success');
        const enhancedJsonEl5 = document.getElementById('enhanced-json');
        if (enhancedJsonEl5 && enhancedResult) enhancedJsonEl5.innerHTML = buildDiffJSON(enhancedResult);
        _markExpansionDone(field);
        return;
    }

    else if (field === 'eventEntity') {
        if (!vals['ev-name'] || !vals['ev-start']) { showToast('Please enter event name and start date', 'warning'); return; }
        const evType = vals['ev-type'] || 'Event';
        const event = {"@type":evType,"@id":baseUrl+'/#event',"name":vals['ev-name'],"__isNew__":true};
        if (vals['ev-description']) event.description = vals['ev-description'];
        event.startDate = vals['ev-start'];
        if (vals['ev-end']) event.endDate = vals['ev-end'];
        if (vals['ev-url']) { event.url = vals['ev-url']; event.mainEntityOfPage = {"@type":"WebPage","@id":vals['ev-url']}; }
        const mode = (vals['ev-mode']||'').toLowerCase();
        if (mode.includes('online')) event.eventAttendanceMode = "https://schema.org/OnlineEventAttendanceMode";
        else if (mode.includes('mixed')) event.eventAttendanceMode = "https://schema.org/MixedEventAttendanceMode";
        else if (mode.includes('person')||mode.includes('inperson')) event.eventAttendanceMode = "https://schema.org/OfflineEventAttendanceMode";
        if (vals['ev-location']) event.location = {"@type":"Place","name":vals['ev-location'],"address":vals['ev-address']||vals['ev-location']};
        if (vals['ev-price']) event.offers = {"@type":"Offer","price":vals['ev-price'],"priceCurrency":vals['ev-currency']||'USD',"availability":"https://schema.org/InStock"};
        const orgRef4 = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Organization','LocalBusiness','ProfessionalService'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (orgRef4 && orgRef4['@id']) event.organizer = {"@id": orgRef4['@id']};
        if (enhancedResult && enhancedResult['@graph']) enhancedResult['@graph'].push(event);
        closeSuggestionWizard();
        showToast('✅ Event schema added!', 'success');
        const enhancedJsonEl6 = document.getElementById('enhanced-json');
        if (enhancedJsonEl6 && enhancedResult) enhancedJsonEl6.innerHTML = buildDiffJSON(enhancedResult);
        _markExpansionDone(field);
        return;
    }

    else if (field === 'articleAbout') {
        if (!vals['ab-topic']) { showToast('Please enter the primary topic name', 'warning'); return; }
        const aboutEntity = {"@type":"Thing","name":vals['ab-topic']};
        const aboutSameAs = [];
        if (vals['ab-wiki']) aboutSameAs.push(vals['ab-wiki']);
        if (vals['ab-wikidata']) { const q = vals['ab-wikidata'].toUpperCase().startsWith('Q')?vals['ab-wikidata']:'Q'+vals['ab-wikidata']; aboutSameAs.push(`https://www.wikidata.org/wiki/${q}`); }
        if (aboutSameAs.length === 1) aboutEntity.sameAs = aboutSameAs[0]; else if (aboutSameAs.length > 1) aboutEntity.sameAs = aboutSameAs;
        const mentions2 = [];
        [1,2,3,4].forEach(n => {
            const name = vals[`ab-ment${n}`];
            if (!name) return;
            const m = {"@type":"Thing","name":name};
            if (vals[`ab-wiki${n}`]) m.sameAs = vals[`ab-wiki${n}`];
            mentions2.push(m);
        });
        const articleEnt = enhancedResult && enhancedResult['@graph'] && enhancedResult['@graph'].find(e => ['Article','BlogPosting','NewsArticle'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (articleEnt) {
            articleEnt.about = aboutEntity;
            articleEnt.__addedFields = (articleEnt.__addedFields||[]); articleEnt.__addedFields.push('about');
            if (mentions2.length) { articleEnt.mentions = mentions2; articleEnt.__addedFields.push('mentions'); }
        } else {
            // If no article entity in graph, add as top-level entity
            if (enhancedResult && enhancedResult['@graph']) {
                if (mentions2.length) aboutEntity.mentions = mentions2;
            }
        }
        closeSuggestionWizard();
        showToast('✅ about/mentions added to article!', 'success');
        const enhancedJsonEl7 = document.getElementById('enhanced-json');
        if (enhancedJsonEl7 && enhancedResult) enhancedJsonEl7.innerHTML = buildDiffJSON(enhancedResult);
        _markExpansionDone(field);
        return;
    }

    else if (field === 'professionalKnowsAbout') {
        const topics2 = [];
        [1,2,3,4,5].forEach(n => {
            const name = vals[`pka-topic${n}`];
            if (!name) return;
            const t = {"@type":"Thing","name":name};
            const tSameAs = [];
            if (vals[`pka-wiki${n}`]) tSameAs.push(vals[`pka-wiki${n}`]);
            if (vals[`pka-wd${n}`]) { const q = vals[`pka-wd${n}`].toUpperCase().startsWith('Q')?vals[`pka-wd${n}`]:'Q'+vals[`pka-wd${n}`]; tSameAs.push(`https://www.wikidata.org/wiki/${q}`); }
            if (tSameAs.length === 1) t.sameAs = tSameAs[0]; else if (tSameAs.length > 1) t.sameAs = tSameAs;
            topics2.push(t);
        });
        if (!topics2.length) { showToast('Please enter at least one topic', 'warning'); return; }
        newSchemaProps.knowsAbout = topics2;
    }

    // Apply newSchemaProps to the primary org entity in the result
    if (Object.keys(newSchemaProps).length > 0 && enhancedResult && enhancedResult['@graph']) {
        const orgTypes = ['Organization','ProfessionalService','LocalBusiness','MedicalBusiness','LegalService','FinancialService','Store','Restaurant'];
        const orgEntity = enhancedResult['@graph'].find(e => orgTypes.includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
        if (orgEntity) {
            Object.assign(orgEntity, newSchemaProps);
            orgEntity.__addedFields = orgEntity.__addedFields || [];
            Object.keys(newSchemaProps).forEach(k => orgEntity.__addedFields.push(k));
        }
    }
    
    // Re-render the enhanced JSON with diff highlighting
    const enhancedJsonEl = document.getElementById('enhanced-json');
    if (enhancedJsonEl && enhancedResult) {
        enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);
    }
    
    // Remove the suggestion from the list
    const suggestionItems = document.querySelectorAll('.change-suggest');
    suggestionItems.forEach(item => {
        if (item.querySelector('.btn-generate') && item.querySelector('.btn-generate').getAttribute('onclick')?.includes(`'${field}'`)) {
            item.style.opacity = '0.4';
            item.innerHTML = `<span class="change-icon">✅</span><span class="change-text" style="text-decoration:line-through;">${item.querySelector('.change-text')?.textContent||''}</span><span style="color:var(--accent-green);font-size:0.8rem;margin-left:8px;">Added!</span>`;
        }
    });
    
    closeSuggestionWizard();
    showToast(`✅ ${wizard.title.replace(/^[^ ]+ /,'')} added to schema!`, 'success');
}

// ─── Enhanced JSON copyEnhancedJSON (get clean text) ─────────────────────────
function copyEnhancedJSON() {
    const el = document.getElementById('enhanced-json');
    if (!el) { showToast('No enhanced schema found', 'error'); return; }
    const raw = el.textContent || el.innerText;
    navigator.clipboard.writeText(raw).then(() => showToast('Enhanced schema copied!', 'success'))
        .catch(() => { const t=document.createElement('textarea');t.value=raw;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showToast('Copied!','success'); });
}
function downloadEnhancedJSON() {
    const el = document.getElementById('enhanced-json');
    if (!el) { showToast('No enhanced schema found', 'error'); return; }
    dl(el.textContent||el.innerText, 'application/ld+json', 'enhanced-schema.json');
}

function copyJSON(schemaObj) {
    const raw = JSON.stringify(schemaObj, null, 2);
    navigator.clipboard.writeText(raw).then(() => showToast('Schema copied!', 'success'))
        .catch(() => { const t=document.createElement('textarea');t.value=raw;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);showToast('Copied!','success'); });
}

// Autodetect-specific copy and download functions
function copyAutodetect() {
    const el = document.getElementById('autodetect-json');
    if (!el) { showToast('No schema data found', 'error'); return; }
    const json = el.textContent;
    if (!json) { showToast('No schema to copy', 'warning'); return; }
    navigator.clipboard.writeText(json).then(() => showToast('Copied!', 'success')).catch(() => {
        const t = document.createElement('textarea');
        t.value = json;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
        showToast('Copied!', 'success');
    });
}

function downloadAutodetect() {
    const el = document.getElementById('autodetect-json');
    if (!el) { showToast('No schema data found', 'error'); return; }
    const json = el.textContent;
    if (!json) { showToast('No schema to download', 'warning'); return; }
    dl(json, 'application/ld+json', 'autodetect-schema.json');
}

function downloadHTML() { dl(`<script type="application/ld+json">\n${getJSON()}\n<\/script>`,'text/html',(val('entity-name')||'schema').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-schema.html'); }
function dl(content,mime,name){const b=new Blob([content],{type:mime});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);showToast('Downloaded!','success');}

// ═══════════════════════════════════════════
//  AUTO-DETECT FROM URL
// ═══════════════════════════════════════════
async function autoDetect() {
    const url = val('autodetect-url');
    if (!url || !isURL(url)) { showToast('Please enter a valid URL.','error'); return; }
    const statusEl = document.getElementById('autodetect-status');
    const outputEl = document.getElementById('autodetect-output');
    if (!outputEl) { showToast('Output element not found','error'); return; }
    outputEl.style.display = 'block';
    outputEl.innerHTML = `<div class="detect-status"><div class="spinner"></div><p>Scanning <strong>${escapeHtml(url)}</strong> for schema entities...</p></div>`;

    try {
        // Try multiple CORS proxies for better reliability
        const proxies = [
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
            (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
        ];
        
        let html = null;
        let lastError = null;
        
        for (const getUrl of proxies) {
            try {
                statusEl && (statusEl.innerHTML = `<div class="spinner"></div><p>Trying ${getUrl === proxies[0] ? 'primary' : 'backup'} proxy...</p>`);
                const resp = await fetch(getUrl(url), { signal: AbortSignal.timeout(20000) });
                if (resp.ok) {
                    html = await resp.text();
                    if (html && html.length > 100) break;
                }
            } catch(e) { 
                lastError = e; 
                console.log('Proxy failed:', getUrl(url), e.message);
            }
        }
        
        if (!html || html.length < 100) {
            const errorMsg = lastError ? lastError.message : 'Could not fetch page content';
            throw new Error(`All proxies failed. Last error: ${errorMsg}`);
        }

        // Extract JSON-LD blocks
        const jsonLdBlocks = [];
        const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            try { jsonLdBlocks.push(JSON.parse(match[1].trim())); } catch(e) {}
        }

        // Extract page title
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const pageTitle = titleMatch ? titleMatch[1].trim() : url;

        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["'](.*?)["']/i);
        const metaDesc = descMatch ? descMatch[1] : '';

        if (jsonLdBlocks.length > 0) {
            // Found existing JSON-LD — display and enhance
            let allEntities = [];
            jsonLdBlocks.forEach(block => {
                if (block['@graph']) allEntities.push(...block['@graph']);
                else allEntities.push(block);
            });

            const types = allEntities.map(e => e['@type']).filter(Boolean);
            const uniqueTypes = [...new Set(types.flat())];

            outputEl.innerHTML = `
                <!-- ═══ RESULTS HEADER ═══ -->
                <div class="results-header-bar">
                    <div class="results-header-left">
                        <div class="results-scan-icon">🔍</div>
                        <div>
                            <h3 class="results-site-title">${escapeHtml(pageTitle)}</h3>
                            <p class="results-meta">Found <strong>${jsonLdBlocks.length}</strong> JSON-LD block(s) · <strong>${allEntities.length}</strong> entities detected</p>
                        </div>
                    </div>
                    <div class="results-header-chips">
                        ${uniqueTypes.map(t=>`<span class="entity-chip">${t}</span>`).join('')}
                    </div>
                    <div class="results-header-actions">
                        <button class="btn btn-outline btn-sm" onclick="visualizeAutoDetect()">🔗 Visualize</button>
                    </div>
                </div>

                <!-- ═══ MAIN RESULTS GRID ═══ -->
                <div class="results-main-grid">

                    <!-- LEFT COLUMN: Original Schema -->
                    <div class="results-col-left">
                        <div class="results-card">
                            <div class="results-card-header">
                                <span class="results-card-icon">📄</span>
                                <h4 class="results-card-title">Original Schema</h4>
                                <div class="results-card-actions">
                                    <button class="btn btn-ghost btn-xs" onclick="copyAutoDetectJSON()">📋 Copy</button>
                                    <button class="btn btn-ghost btn-xs" onclick="testAutoDetectSchema()">🧪 Test</button>
                                </div>
                            </div>
                            <div class="results-card-body">
                                <pre class="code-output" id="autodetect-json" style="max-height:380px;overflow-y:auto;margin:0;">${syntaxHighlight(JSON.stringify(jsonLdBlocks.length===1?jsonLdBlocks[0]:{"@context":"https://schema.org","@graph":allEntities},null,2))}</pre>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: Unified Suggestions (filled by JS below) -->
                    <div class="results-col-right">
                        <div id="unified-suggestions-col"></div>
                    </div>

                </div>

                <!-- ═══ ENHANCED JSON (full width) ═══ -->
                <div class="results-enhanced-row" id="enhanced-json-row">
                    <div class="results-card results-card-enhanced">
                        <div class="results-card-header">
                            <span class="results-card-icon">⚡</span>
                            <h4 class="results-card-title">Enhanced JSON-LD</h4>
                            <div class="results-diff-legend">
                                <span class="diff-leg diff-leg-new">New Entity</span>
                                <span class="diff-leg diff-leg-added">Added Property</span>
                            </div>
                            <div class="results-card-actions">
                                <span class="badge-verified">✅ VERIFIED</span>
                                <button class="btn btn-primary btn-sm" onclick="copyEnhancedJSON()">📋 Copy</button>
                                <button class="btn btn-ghost btn-sm" onclick="copyMinifiedEnhanced()">🗜 Min</button>
                                <button class="btn btn-ghost btn-sm" onclick="downloadEnhancedJSON()">⬇ .json</button>
                                <button class="btn btn-ghost btn-sm" onclick="testEnhancedSchema()">🧪 Test</button>
                            </div>
                        </div>
                        <div class="results-card-body">
                            <pre class="code-output" id="enhanced-json" style="min-height:280px;overflow-y:auto;margin:0;"></pre>
                        </div>
                    </div>
                </div>`;

            // Generate enhanced schema
            window._lastScannedHTML = html;  // store for wizard auto-scan
            const enhancedResult = enhanceSchema(allEntities, url, pageTitle, html, metaDesc);
            window._currentEnhancedResult = enhancedResult;
            window._currentEnhancedURL = url;
            window._currentEnhancedTitle = pageTitle;
            window._currentSchemaJSON = jsonLdBlocks.length === 1 ? jsonLdBlocks[0] : {"@context":"https://schema.org","@graph":allEntities};

            // Schema self-verification
            const schemaVerification = verifyGeneratedSchema(enhancedResult['@graph'], url, html);
            window._currentSchemaVerification = schemaVerification;

            // Render enhanced JSON with diff highlighting
            const enhancedJsonEl = document.getElementById('enhanced-json');
            if (enhancedJsonEl) enhancedJsonEl.innerHTML = buildDiffJSON(enhancedResult);

            // Render unified suggestions panel
            const actualChanges = enhancedResult._changes.filter(c => c.type !== 'suggest');
            const suggestions = enhancedResult._changes.filter(c => c.type === 'suggest');
            window._lastEnhancementChanges = actualChanges;

            const unifiedCol = document.getElementById('unified-suggestions-col');
            if (unifiedCol) {
                const exp = (enhancedResult._expansion && enhancedResult._expansion.expansionSuggestions.length > 0)
                    ? enhancedResult._expansion : null;
                unifiedCol.innerHTML = renderUnifiedSuggestionsPanel(enhancedResult._changes, exp);
            }

            appStats.schemas++; appStats.lastUsed='Auto-Detect'; appStats.entities+=allEntities.length; saveStats();
        } else {
            // No JSON-LD found — generate from page metadata
            // Generate base schema from metadata then run enhanceSchema for suggestions
            window._lastScannedHTML = html;  // store for wizard auto-scan
            const generatedSchema = generateFromMeta(url, pageTitle, metaDesc, html);
            const generatedEntities = generatedSchema['@graph'] || [generatedSchema];
            const enhancedGenResult = enhanceSchema(generatedEntities, url, pageTitle, html, metaDesc);
            window._currentEnhancedResult = enhancedGenResult;
            window._currentEnhancedURL = url;
            window._currentEnhancedTitle = pageTitle;
            window._currentSchemaJSON = generatedSchema;

            // ── SCHEMA SELF-VERIFICATION: Verify the generated schema ──
            const schemaVerification = verifyGeneratedSchema(enhancedGenResult['@graph'], url, html);
            window._currentSchemaVerification = schemaVerification;
            
            const actualGenChanges = enhancedGenResult._changes.filter(c => c.type !== 'suggest');
            const genSuggestions = enhancedGenResult._changes.filter(c => c.type === 'suggest');

            // Entity chips from enhanced result
            const detectedEntityTypes = [...new Set((enhancedGenResult['@graph']||[]).map(e => Array.isArray(e['@type'])?e['@type'][0]:e['@type']).filter(Boolean))];
            const chipColors = {'WebSite':'var(--accent-teal)','Organization':'var(--accent-purple)','LocalBusiness':'var(--accent-purple)','BlogPosting':'var(--accent-blue)','Article':'var(--accent-blue)','NewsArticle':'var(--accent-blue)','BreadcrumbList':'var(--accent-orange)','WebPage':'#64748b','HowTo':'var(--accent-green)','FAQPage':'var(--accent-pink)','Product':'var(--accent-green)','Person':'var(--accent-cyan)'};
            
            outputEl.innerHTML = `
                <!-- ═══ RESULTS HEADER ═══ -->
                <div class="results-header-bar">
                    <div class="results-header-left">
                        <div class="results-scan-icon">✨</div>
                        <div>
                            <h3 class="results-site-title">${escapeHtml(pageTitle)}</h3>
                            <p class="results-meta">No existing schema found — auto-generated from page content</p>
                        </div>
                    </div>
                    <div class="results-header-chips">
                        ${detectedEntityTypes.map(t=>`<span class="entity-chip" style="background:${(chipColors[t]||'#64748b')}22;color:${(chipColors[t]||'#94a3b8')};border:1px solid ${(chipColors[t]||'#64748b')}44;">${t}</span>`).join('')}
                    </div>
                </div>

                <!-- ═══ MAIN RESULTS GRID ═══ -->
                <div class="results-main-grid">

                    <!-- LEFT COLUMN: Generated Schema -->
                    <div class="results-col-left">
                        <div class="results-card">
                            <div class="results-card-header">
                                <span class="results-card-icon">📄</span>
                                <h4 class="results-card-title">Generated Schema</h4>
                                <div class="results-card-actions">
                                    <button class="btn btn-ghost btn-xs" onclick="copyAutoDetectJSON()">📋 Copy</button>
                                    <button class="btn btn-ghost btn-xs" onclick="testAutoDetectSchema()">🧪 Test</button>
                                </div>
                            </div>
                            <div class="results-card-body">
                                <pre class="code-output" id="autodetect-json" style="max-height:380px;overflow-y:auto;margin:0;">${syntaxHighlight(JSON.stringify(generatedSchema,null,2))}</pre>
                            </div>
                        </div>
                        ${actualGenChanges.length > 0 ? `
                        <div class="results-card" style="margin-top:14px;">
                            <div class="results-card-header">
                                <span class="results-card-icon">🔧</span>
                                <h4 class="results-card-title">Auto-Generated Additions</h4>
                                <span class="usp-count-badge">${actualGenChanges.length}</span>
                            </div>
                            <div class="results-card-body" style="padding:12px 16px;">
                                <ul class="unified-suggestion-list" style="margin:0;">
                                    ${actualGenChanges.map(c=>`
                                    <li class="unified-suggestion-item" style="border-left:3px solid ${c.type==='create'?'#10b981':'#3b82f6'};">
                                        <div class="usi-row">
                                            <span class="usi-icon">${c.type==='add'?'✅':c.type==='create'?'🆕':'✏️'}</span>
                                            <div class="usi-body"><span class="usi-title">${escapeHtml(c.message)}</span></div>
                                        </div>
                                    </li>`).join('')}
                                </ul>
                            </div>
                        </div>` : ''}
                    </div>

                    <!-- RIGHT COLUMN: Unified Suggestions (filled by JS below) -->
                    <div class="results-col-right">
                        <div id="unified-suggestions-col"></div>
                    </div>

                </div>

                <!-- ═══ ENHANCED JSON (full width) ═══ -->
                <div class="results-enhanced-row" id="enhanced-json-row">
                    <div class="results-card results-card-enhanced">
                        <div class="results-card-header">
                            <span class="results-card-icon">⚡</span>
                            <h4 class="results-card-title">Enhanced JSON-LD</h4>
                            <div class="results-diff-legend">
                                <span class="diff-leg diff-leg-new">New Entity</span>
                                <span class="diff-leg diff-leg-added">Added Property</span>
                            </div>
                            <div class="results-card-actions">
                                <span class="badge-verified">✅ VERIFIED</span>
                                <button class="btn btn-primary btn-sm" onclick="copyEnhancedJSON()">📋 Copy</button>
                                <button class="btn btn-ghost btn-sm" onclick="copyMinifiedEnhanced()">🗜 Min</button>
                                <button class="btn btn-ghost btn-sm" onclick="downloadEnhancedJSON()">⬇ .json</button>
                                <button class="btn btn-ghost btn-sm" onclick="testEnhancedSchema()">🧪 Test</button>
                            </div>
                        </div>
                        <div class="results-card-body">
                            <pre class="code-output" id="enhanced-json" style="min-height:280px;overflow-y:auto;margin:0;"></pre>
                        </div>
                    </div>
                </div>`;

            // Render enhanced JSON with diff highlighting
            const enhancedGenEl = document.getElementById('enhanced-json');
            if (enhancedGenEl) enhancedGenEl.innerHTML = buildDiffJSON(enhancedGenResult);
            window._lastEnhancementChanges = actualGenChanges;

            // Render unified suggestions panel (suggestions + entity expansion combined)
            const unifiedColGen = document.getElementById('unified-suggestions-col');
            if (unifiedColGen) {
                const expGen = (enhancedGenResult._expansion && enhancedGenResult._expansion.expansionSuggestions.length > 0)
                    ? enhancedGenResult._expansion : null;
                // Only pass suggestions (not actualGenChanges — those are shown on left)
                const suggestionsOnly = enhancedGenResult._changes.filter(c => c.type === 'suggest');
                unifiedColGen.innerHTML = renderUnifiedSuggestionsPanel(
                    suggestionsOnly.map(c => ({...c})),
                    expGen
                );
            }

            appStats.schemas++; appStats.lastUsed='Auto-Detect'; saveStats();
        }
        showToast('Scan complete!','success');
    } catch(err) {
        outputEl.innerHTML = `
            <div class="detect-status error-state">
                <div class="error-icon">⚠️</div>
                <h3>Unable to Fetch URL</h3>
                <p>Could not retrieve schema from <strong>${escapeHtml(url)}</strong></p>
                <div class="error-details">
                    <p class="text-sm text-muted">Error: ${escapeHtml(err.message)}</p>
                </div>
                <div class="error-suggestions" style="margin-top:16px">
                    <p><strong>Try these alternatives:</strong></p>
                    <ul style="margin:8px 0 16px 20px">
                        <li>Use the <strong>Guided Wizard</strong> to build schema manually</li>
                        <li>Check if the URL is publicly accessible</li>
                        <li>Try a different URL from the same site</li>
                        <li>Paste the page's HTML directly in the validator</li>
                    </ul>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                        <button class="btn btn-primary" onclick="showView('wizard')">🧙 Use Guided Wizard</button>
                        <button class="btn btn-outline" onclick="showView('validator')">📋 Use Validator</button>
                    </div>
                </div>
            </div>`;
        showToast('Scan failed.','error');
    }
}

// ─── diff helpers ─────────────────────────────────────────────────────────────
// Marks keys that were added during enhancement so we can highlight them
const _ADDED_MARKER = '​● ';  // zero-width space + bullet (stripped from final JSON)

function markAdded(obj) {
    // Wrap in a special object that we recognise during stringify-diff
    return {__added__: true, value: obj};
}

// Produce syntax-highlighted JSON where added properties are wrapped in a highlight span
function syntaxHighlightDiff(json, addedPaths) {
    // addedPaths: Set of dot-paths that were added e.g. {"0.publisher","2.@id"}
    const lines = json.split('\n');
    const result = [];
    let depth = 0;
    const keyStack = [];
    
    for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        // Determine current path from key context - simple heuristic: track quoted keys
        const keyMatch = line.match(/^\s*"([^"]+)"\s*:/);
        const currentKey = keyMatch ? keyMatch[1] : null;
        
        // Check open/close brackets to track depth
        const opens = (line.match(/[{[]/g)||[]).length;
        const closes = (line.match(/[}\]]/g)||[]).length;
        
        let highlighted = syntaxHighlight(line);
        
        // Check if this key path is in our added set
        if (currentKey && addedPaths && addedPaths.size > 0) {
            // Build a rough path key from last seen entity index + key
            const isAdded = [...addedPaths].some(p => p.endsWith('.' + currentKey) || p === currentKey);
            if (isAdded) {
                highlighted = `<span class="diff-added">${highlighted}</span>`;
            }
        }
        
        result.push(highlighted);
        depth += opens - closes;
    }
    return result.join('\n');
}

// ============================================================
// SCHEMA SELF-VERIFICATION PROTOCOL
// Based on Google Search Central, Schema.org, and E-E-A-T guidelines.
// Purpose: Improve accuracy, reduce incorrect schema usage, ensure
// all structured data recommendations comply with authoritative sources.
// Authoritative references:
//   https://developers.google.com/search/docs/appearance/structured-data
//   https://schema.org/docs/full.html
//   https://developers.google.com/search/docs/appearance/structured-data/article
//   https://developers.google.com/search/docs/appearance/structured-data/faqpage
//   https://developers.google.com/search/docs/appearance/structured-data/how-to
//   https://developers.google.com/search/docs/appearance/structured-data/product
// ============================================================
const SCHEMA_VERIFICATION_RULES = {
    // BLACKLIST: conditions under which a schema type MUST NOT be recommended
    blacklist: {
        FAQPage: {
            reason: 'FAQPage requires visible, distinct Q&A pairs present in the actual page content',
            check: (html, title, url) => {
                // Only recommend if we can detect real Q&A structure in the HTML
                const hasFaqStructure = /(<dt[^>]*>|<[^>]*class=["\'][^"\']*faq[^"\']*["\']|<[^>]*class=["\'][^"\']*question[^"\']*["\'])/i.test(html || '');
                const hasFaqUrl = /\/faq|\/frequently-asked|\/q-and-a/i.test(url || '');
                const hasFaqTitle = /\bfaq\b|frequently.asked.questions|q\s*&\s*a|questions? and answers?/i.test(title || '');
                // Require BOTH a structural indicator AND (URL or title signal)
                return hasFaqStructure && (hasFaqUrl || hasFaqTitle);
            }
        },
        HowTo: {
            reason: 'HowTo requires explicit numbered/sequential steps in the page content — not general guides',
            check: (html, title, url) => {
                // Must have numbered list / step structure in HTML
                const hasStepStructure = /<ol[^>]*>[\s\S]*?<li|class=["\'][^"\']*step[^"\']*["\']|data-step|<[^>]*step-\d/i.test(html || '');
                const hasHowToUrl = /\/how[-_]?to\/|\/guide\/|\/tutorial\//i.test(url || '');
                const hasHowToTitle = /\bhow[-\s]to\b|step[- ]by[- ]step/i.test(title || '');
                // Require step structure + (URL or title signal)
                return hasStepStructure && (hasHowToUrl || hasHowToTitle);
            }
        },
        Product: {
            reason: 'Product schema requires a specific purchasable product — not services, categories, or informational pages',
            check: (html, title, url) => {
                // Must have product-specific signals: price, add-to-cart, SKU, or product URL pattern
                const hasProductUrl = /\/product\/|\/products\/|\/shop\/|\/store\/|\/item\/|\/p\/|\/buy\//i.test(url || '');
                const hasProductHtml = /add[-_\s]?to[-_\s]?cart|buy[-_\s]?now|in[-_\s]?stock|out[-_\s]?of[-_\s]?stock|class=["\'][^"\']*product[^"\']*["\']|data-product-id|\bsku\b|\bprice\b.*\$|\$.*\bprice\b/i.test(html || '');
                return hasProductUrl || hasProductHtml;
            }
        },
        Recipe: {
            reason: 'Recipe schema requires actual recipe content with ingredients and instructions',
            check: (html, title, url) => {
                const hasRecipeUrl = /\/recipe\/|\/recipes\//i.test(url || '');
                const hasIngredients = /\bingredients?\b/i.test(html || '');
                const hasInstructions = /\binstructions?\b|\bdirections?\b|\bsteps?\b/i.test(html || '');
                return hasRecipeUrl && hasIngredients && hasInstructions;
            }
        },
        Event: {
            reason: 'Event schema requires a specific future or past event with date, name, and location',
            check: (html, title, url) => {
                const hasEventUrl = /\/event\/|\/events\/|\/webinar\/|\/conference\//i.test(url || '');
                const hasEventDate = /<time[^>]*datetime|event[-_]?date|start[-_]?date/i.test(html || '');
                return hasEventUrl || hasEventDate;
            }
        },
        NewsArticle: {
            reason: 'NewsArticle requires actual news content published by a recognized news outlet',
            check: (html, title, url) => {
                const hasNewsUrl = /\/news\/|\/press-release\/|\/announcement\//i.test(url || '');
                const hasNewsOg = /og:type.*article|article:published_time/i.test(html || '');
                return hasNewsUrl || hasNewsOg;
            }
        }
    },

    // REQUIRED properties that MUST exist before a schema type is considered valid
    requiredProperties: {
        BlogPosting:  ['headline'],
        Article:      ['headline'],
        NewsArticle:  ['headline'],
        FAQPage:      ['mainEntity'],
        HowTo:        ['name', 'step'],
        Product:      ['name'],
        Recipe:       ['name', 'recipeIngredient'],
        Event:        ['name', 'startDate'],
        Review:       ['reviewBody', 'itemReviewed'],
        JobPosting:   ['title', 'hiringOrganization', 'jobLocation'],
        Course:       ['name', 'description'],
        VideoObject:  ['name', 'description', 'thumbnailUrl', 'uploadDate']
    },

    // PROPERTY INVENTION BLACKLIST — never invent these if not found in HTML
    doNotInvent: [
        'aggregateRating',   // Never invent ratings/review counts
        'ratingValue',       // Never invent rating values
        'reviewCount',       // Never invent review counts
        'price',             // Never invent prices
        'priceCurrency',     // Never invent currencies
        'author',            // Never invent author names
        'datePublished',     // Never invent publication dates
        'dateModified',      // Never invent modification dates
        'telephone',         // Never invent phone numbers
        'email',             // Never invent email addresses
        'address',           // Never invent physical addresses
        'geo',               // Never invent geographic coordinates
        'openingHours',      // Never invent opening hours
        'founder',           // Never invent founder names
        'employee',          // Never invent employee names
        'numberOfEmployees', // Never invent employee counts
        'foundingDate',      // Never invent founding dates
        'award',             // Never invent awards
        'isbn',              // Never invent ISBNs
        'sku',               // Never invent SKUs
        'gtin',              // Never invent GTINs
    ],

    // MINIMUM CONFIDENCE THRESHOLDS for auto-suggesting each type
    confidenceThresholds: {
        FAQPage:     0.75,  // High threshold — needs clear FAQ structure
        HowTo:       0.75,  // High threshold — needs clear step structure
        Product:     0.70,  // Needs product signals
        Recipe:      0.80,  // Needs recipe signals
        Event:       0.75,  // Needs event date/name
        BlogPosting: 0.60,  // Medium — URL + content signals
        Article:     0.60,  // Medium — content signals
        NewsArticle: 0.70,  // Higher — needs news outlet signals
        Service:     0.55,  // Lower — common for business pages
        Organization:0.50,  // Default for most sites
        WebSite:     0.50,  // Always valid
        WebPage:     0.50,  // Always valid
        default:     0.65
    }
};

/**
 * SCHEMA SELF-VERIFICATION: Validate whether a schema type candidate
 * is appropriate for the current page context.
 * 
 * Step 1: Page Intent Classification (is the page what we think it is?)
 * Step 2: Candidate Identification (what schema types are candidates?)
 * Step 3: Elimination Review (blacklist check)
 * Step 4: Documentation Verification (required properties check)
 * Step 5: Property Validation (no invented data)
 * Step 6: Self-Correction Pass (prefer fewer, accurate types)
 * 
 * Returns: { valid: boolean, reason: string, confidence: number }
 */
function validateSchemaCandidate(schemaType, html, title, url, confidence) {
    // Step 3: Elimination Review — check blacklist
    const blacklistRule = SCHEMA_VERIFICATION_RULES.blacklist[schemaType];
    if (blacklistRule) {
        const passesBlacklist = blacklistRule.check(html || '', title || '', url || '');
        if (!passesBlacklist) {
            return {
                valid: false,
                reason: `Blacklisted: ${blacklistRule.reason}`,
                confidence: 0
            };
        }
    }

    // Step 2 / Step 6: Confidence threshold check
    const threshold = SCHEMA_VERIFICATION_RULES.confidenceThresholds[schemaType] 
                   || SCHEMA_VERIFICATION_RULES.confidenceThresholds.default;
    if (typeof confidence === 'number' && confidence < threshold) {
        return {
            valid: false,
            reason: `Below confidence threshold (${confidence.toFixed(2)} < ${threshold}) for ${schemaType}`,
            confidence
        };
    }

    return { valid: true, reason: 'Passed verification', confidence: confidence || threshold };
}

/**
 * Verify that an entity object has the required properties for its @type.
 * Returns array of missing required properties.
 */
function getMissingRequiredProperties(schemaType, entityObj) {
    const required = SCHEMA_VERIFICATION_RULES.requiredProperties[schemaType] || [];
    return required.filter(prop => {
        const val = entityObj[prop];
        return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
    });
}

/**
 * Self-Correction Pass: Remove or downgrade suggestions that are speculative.
 * Applies the "prefer fewer, accurate schema types" principle.
 * Deduplicates suggestions and removes low-confidence or redundant ones.
 */
function selfCorrectSuggestions(changes, html, title, url) {
    const seen = new Set();
    const result = [];

    for (const change of changes) {
        if (change.type !== 'suggest') {
            result.push(change);
            continue;
        }

        const field = change.field;

        // Deduplicate by field
        if (seen.has(field)) continue;
        seen.add(field);

        // Schema-type-specific validation for suggest changes
        const schemaTypeMap = {
            addBlogPosting: 'BlogPosting',
            addHowTo:       'HowTo',
            addFAQPage:     'FAQPage',
            addProduct:     'Product',
            faqSection:     'FAQPage',
            howToSchema:    'HowTo',
        };

        const schemaType = schemaTypeMap[field];
        if (schemaType) {
            const validation = validateSchemaCandidate(schemaType, html, title, url, 0.8);
            if (!validation.valid) {
                // Skip this speculative suggestion
                continue;
            }
        }

        result.push(change);
    }

    return result;
}

/**
 * Verify a generated schema @graph against the Self-Verification Protocol.
 * Checks that all entities are valid, no blacklisted patterns exist,
 * and no invented data has been introduced.
 * 
 * Returns: { valid: boolean, issues: string[], warnings: string[], entityCount: number }
 */
function verifyGeneratedSchema(graph, url, html) {
    const result = {
        valid: true,
        issues: [],      // Critical problems that should block or flag
        warnings: [],    // Non-critical issues to note
        entityCount: graph ? graph.length : 0,
        verifiedTypes: []
    };

    if (!graph || !Array.isArray(graph)) {
        result.valid = false;
        result.issues.push('Schema @graph is missing or invalid');
        return result;
    }

    // Derive baseUrl for checking @id patterns
    let baseUrl = '';
    try { baseUrl = new URL(url).origin; } catch(e) { baseUrl = url.replace(/\/+$/, ''); }

    for (const entity of graph) {
        const entityType = Array.isArray(entity['@type']) ? entity['@type'][0] : entity['@type'];
        if (!entityType) continue;

        result.verifiedTypes.push(entityType);

        // Check: Entity has @id (required for @graph architecture)
        if (!entity['@id']) {
            result.warnings.push(`${entityType} entity missing @id`);
        }

        // Check: @id uses clean pattern (not title-based slug)
        if (entity['@id']) {
            const entityId = entity['@id'];
            // Organization should have /#organization (not /#organization-some-long-title)
            const orgTypes = ['Organization','LocalBusiness','ProfessionalService','MedicalBusiness','LegalService','FinancialService','Store','Restaurant','Hotel'];
            if (orgTypes.includes(entityType) && entityId.includes('/#organization-')) {
                result.warnings.push(`Organization @id appears to use title-based slug (should be /#organization)`);
            }
            // WebSite should have /#website
            if (entityType === 'WebSite' && !entityId.endsWith('/#website')) {
                result.warnings.push(`WebSite @id should be ${baseUrl}/#website`);
            }
        }

        // Check: mainEntityOfPage only on content entities (not Organization/WebSite)
        const nonContentTypes = ['Organization', 'WebSite', 'WebPage', 'BreadcrumbList', 'SiteNavigationElement', 'Person'];
        if (nonContentTypes.includes(entityType) && entity.mainEntityOfPage) {
            result.issues.push(`${entityType} should not have mainEntityOfPage`);
        }

        // Check: Content entities should have mainEntityOfPage pointing to the correct page
        const contentTypes = ['Article', 'BlogPosting', 'NewsArticle', 'Product', 'FAQPage', 'HowTo', 'Recipe', 'Event', 'Course'];
        if (contentTypes.includes(entityType) && entity.url && !entity.mainEntityOfPage) {
            result.warnings.push(`${entityType} is missing mainEntityOfPage`);
        }

        // Check: No invented properties (check against doNotInvent list, but allow if they existed in source)
        // This is advisory — we can't know if values were invented vs. extracted, but we flag suspicious patterns
        const inventedPropWarnings = [];
        for (const prop of SCHEMA_VERIFICATION_RULES.doNotInvent) {
            if (entity[prop] && entity.__addedFields && entity.__addedFields.includes(prop)) {
                // This property was ADDED by our tool — we should have verified it came from a wizard
                // Flag it as a warning if it looks auto-generated
                const val = entity[prop];
                if (typeof val === 'string') {
                    // Check for placeholder-like values
                    if (/^(your|example|placeholder|xxx|test|n\/a|tbd)/i.test(val)) {
                        inventedPropWarnings.push(prop);
                    }
                }
            }
        }
        if (inventedPropWarnings.length > 0) {
            result.warnings.push(`${entityType} has potentially placeholder values for: ${inventedPropWarnings.join(', ')}`);
        }

        // Check: FAQPage must have mainEntity with Question items
        if (entityType === 'FAQPage') {
            if (!entity.mainEntity || !Array.isArray(entity.mainEntity) || entity.mainEntity.length === 0) {
                result.issues.push('FAQPage missing mainEntity with Question items');
            }
        }

        // Check: HowTo must have step property
        if (entityType === 'HowTo' && !entity.step) {
            result.issues.push('HowTo missing step property');
        }

        // Check: Product should have offers or at least name
        if (entityType === 'Product' && !entity.name) {
            result.warnings.push('Product missing name property');
        }

        // Check: Article/BlogPosting should have headline
        if (['Article', 'BlogPosting', 'NewsArticle'].includes(entityType) && !entity.headline && !entity.name) {
            result.warnings.push(`${entityType} missing headline`);
        }
    }

    // If we have issues, the schema is still "valid" but flagged
    // Issues are warnings, not blockers — the user can still use the schema
    if (result.issues.length > 0) {
        // Don't mark as invalid — these are verification notes, not blockers
        // result.valid = false;
    }

    return result;
}

// ============================================================
// END SCHEMA SELF-VERIFICATION PROTOCOL
// ============================================================

// ============================================================
// ENTITY EXPANSION & STRATEGIC SCHEMA MODELING MODULE
// ============================================================
// Think like a semantic SEO strategist and entity architect.
// Goal: improve machine understanding of who, what, where, how.
// ============================================================

/**
 * Step 1 detector patterns — identify which real-world entity classes
 * are likely present on the page based on URL, title, and HTML signals.
 */
const ENTITY_CLASS_DETECTORS = {
    // People / Practitioners
    person: {
        urlPatterns: /\/team|\/about|\/staff|\/attorney|\/lawyer|\/doctor|\/therapist|\/trainer|\/consultant|\/author|\/founder|\/provider|\/practitioner|\/expert/i,
        htmlPatterns: /<h[1-6][^>]*>.*?(founder|ceo|director|attorney|lawyer|dr\.?|doctor|therapist|trainer|consultant|coach|specialist|expert|practitioner|provider|author|reviewer)\b/i,
        titlePatterns: /\b(founder|ceo|attorney|lawyer|dr\.?|therapist|trainer|consultant|coach|specialist|expert|practitioner|author)\b/i
    },
    // Services
    service: {
        urlPatterns: /\/service|\/what-we-do|\/solutions|\/offering|\/treatment|\/therapy|\/program|\/package|\/plan/i,
        htmlPatterns: /<h[1-6][^>]*>.*?(service|solution|offering|treatment|therapy|program|package|plan)\b|our services|we offer|what we do/i,
        titlePatterns: /\bservice|solution|treatment|therapy|program|package\b/i
    },
    // Products
    product: {
        urlPatterns: /\/product|\/shop|\/store|\/buy|\/purchase|\/item/i,
        htmlPatterns: /add to cart|buy now|in stock|out of stock|price|sku|product\-price|woocommerce|shopify/i,
        titlePatterns: /\bbuy|shop|product|store\b/i
    },
    // Location / Local Business
    location: {
        urlPatterns: /\/location|\/contact|\/find-us|\/directions|\/office|\/branch/i,
        htmlPatterns: /opening hours|business hours|get directions|find us|our location|google maps|\d{5}(-\d{4})?|\+1[\s\-\(]?\d{3}/i,
        titlePatterns: /\blocation|office|branch|directions\b/i
    },
    // FAQs
    faq: {
        urlPatterns: /\/faq|\/frequently-asked|\/questions|\/q-and-a/i,
        htmlPatterns: /(<dt[^>]*>|<[^>]*class=["\'][^"\']*faq[^"\']*["\']|<[^>]*class=["\'][^"\']*question[^"\']*["\']|frequently asked question)/i,
        titlePatterns: /\bfaq\b|frequently.asked|q\s*&\s*a/i
    },
    // Reviews / Ratings
    reviews: {
        urlPatterns: /\/review|\/testimonial|\/feedback|\/rating/i,
        htmlPatterns: /testimonial|star rating|\d+(\.\d+)?\s*(out of|\/)\s*5|rated \d|based on \d+ review|\d+ review/i,
        titlePatterns: /\breview|testimonial|rating\b/i
    },
    // Medical / Health
    medical: {
        urlPatterns: /\/condition|\/treatment|\/therapy|\/symptom|\/diagnosis|\/procedure|\/health|\/medical|\/clinical/i,
        htmlPatterns: /condition|symptom|diagnosis|treatment|therapy|procedure|clinical|patient|medical|health care/i,
        titlePatterns: /\bcondition|symptom|treatment|therapy|clinical|medical|health\b/i
    },
    // Legal
    legal: {
        urlPatterns: /\/practice-area|\/case-type|\/legal|\/law|\/attorney|\/lawyer|\/firm/i,
        htmlPatterns: /practice area|case type|legal advice|attorney|lawyer|law firm|jurisdiction|court|litigation|settlement/i,
        titlePatterns: /\battorney|lawyer|law|legal|litigation\b/i
    },
    // Events
    event: {
        urlPatterns: /\/event|\/webinar|\/conference|\/workshop|\/seminar|\/training|\/class/i,
        htmlPatterns: /register now|event date|start date|end date|webinar|conference|workshop|seminar|attend|speaker/i,
        titlePatterns: /\bevent|webinar|conference|workshop|seminar\b/i
    },
    // Articles / Blog
    article: {
        urlPatterns: /\/blog|\/article|\/post|\/news|\/insights|\/resources|\/guide|\/tutorial/i,
        htmlPatterns: /<article|by\s+<a|published|date published|author|reading time|word count/i,
        titlePatterns: /\bguide|tutorial|how to|tips|article|blog\b/i
    },
    // Credentials / Trust
    credentials: {
        urlPatterns: /\/accreditation|\/certification|\/award|\/membership|\/license/i,
        htmlPatterns: /certified|accredited|licensed|member of|award|recognition|bbbb|chamber of commerce|iso \d|years? (in business|experience)|founded in \d{4}/i,
        titlePatterns: /\bcertified|accredited|licensed|award\b/i
    },
    // Video content
    video: {
        urlPatterns: /\/video|\/watch|\/media/i,
        htmlPatterns: /<video|youtube\.com\/embed|vimeo\.com\/video|<iframe[^>]*youtube|<iframe[^>]*vimeo/i,
        titlePatterns: /\bvideo|watch\b/i
    }
};

/**
 * Run Step 1: Identify which entity classes are present on the page.
 * Returns a map of { entityClass: true/false }.
 */
function detectEntityClasses(url, title, html) {
    const detected = {};
    const htmlLower = (html || '').toLowerCase().substring(0, 50000); // Cap for performance
    const titleLower = (title || '').toLowerCase();
    const urlLower = (url || '').toLowerCase();

    for (const [cls, detector] of Object.entries(ENTITY_CLASS_DETECTORS)) {
        const urlMatch = detector.urlPatterns.test(urlLower);
        const titleMatch = detector.titlePatterns.test(titleLower);
        const htmlMatch = detector.htmlPatterns.test(htmlLower);
        detected[cls] = urlMatch || titleMatch || htmlMatch;
    }
    return detected;
}

/**
 * Step 4: Expand shallow strings in knowsAbout, serviceType, keywords, etc.
 * into structured Thing/Service/Concept entity objects with @type and name.
 */
function expandShallowStrings(entityObj, baseUrl) {
    const expansions = [];

    // Expand string items in knowsAbout into Thing nodes
    if (Array.isArray(entityObj.knowsAbout)) {
        entityObj.knowsAbout = entityObj.knowsAbout.map(item => {
            if (typeof item === 'string') {
                return { '@type': 'Thing', 'name': item };
            }
            return item;
        });
    }

    // Expand string items in hasOfferCatalog / itemListElement
    if (entityObj.hasOfferCatalog && entityObj.hasOfferCatalog.itemListElement) {
        // Handle both array and single object cases
        let items = entityObj.hasOfferCatalog.itemListElement;
        if (!Array.isArray(items)) {
            items = [items];
        }
        entityObj.hasOfferCatalog.itemListElement = items.map(item => {
            if (typeof item === 'string') {
                const svcId = baseUrl + '/#service-' + item.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return { '@type': 'Service', '@id': svcId, 'name': item, 'provider': { '@id': baseUrl + '/#organization' } };
            }
            return item;
        });
    }

    return expansions;
}

/**
 * Step 6: Evaluate trust and authority gaps.
 * Returns list of trust-signal suggestions.
 */
function evaluateTrustGaps(graph, html, url) {
    const suggestions = [];
    const htmlLower = (html || '').toLowerCase();
    const baseUrl = (() => { try { return new URL(url).origin; } catch(e) { return ''; } })();

    const orgEntity = graph.find(e => {
        const t = Array.isArray(e['@type']) ? e['@type'][0] : e['@type'];
        return ['Organization','LocalBusiness','ProfessionalService','MedicalBusiness','LegalService','FinancialService','HomeAndConstructionBusiness'].includes(t);
    });

    if (!orgEntity) return suggestions;

    // Check for founding date / years in business
    const hasFoundingDate = orgEntity.foundingDate || orgEntity.foundingLocation;
    const pageHasFounding = /founded in \d{4}|since \d{4}|\d+ years? (in business|of experience)/i.test(htmlLower);
    if (!hasFoundingDate && pageHasFounding) {
        suggestions.push({
            type: 'expansion',
            priority: 'medium',
            field: 'foundingDate',
            entity: orgEntity.name || 'Organization',
            message: 'Page mentions founding date/years in business — add foundingDate to Organization for trust signal',
            schemaHint: { foundingDate: 'YYYY' }
        });
    }

    // Check for certifications / accreditations / awards
    const hasCreds = orgEntity.award || orgEntity.hasCredential || orgEntity.memberOf || orgEntity.accreditation;
    const pageMentionsCreds = /\b(certified|accredited|licensed|award|recognition|member of|chamber|iso \d|bbb\b)/i.test(htmlLower);
    if (!hasCreds && pageMentionsCreds) {
        suggestions.push({
            type: 'expansion',
            priority: 'high',
            field: 'credentialTrust',
            entity: orgEntity.name || 'Organization',
            message: 'Page mentions certifications/accreditations/awards — model as award or memberOf for E-E-A-T trust signals',
            schemaHint: {
                award: ['Certification or Award Name'],
                memberOf: [{ '@type': 'Organization', 'name': 'Industry Association' }]
            }
        });
    }

    // Check for number of employees / staff
    const hasEmployeeCount = orgEntity.numberOfEmployees;
    const pageHasTeamSize = /\d+ (employees|staff|team members|professionals|experts)/i.test(htmlLower);
    if (!hasEmployeeCount && pageHasTeamSize) {
        suggestions.push({
            type: 'expansion',
            priority: 'low',
            field: 'numberOfEmployees',
            entity: orgEntity.name || 'Organization',
            message: 'Page mentions team size — add numberOfEmployees for organizational credibility',
            schemaHint: { numberOfEmployees: { '@type': 'QuantitativeValue', 'value': 0 } }
        });
    }

    // Check for reviews (AggregateRating)
    const hasRating = orgEntity.aggregateRating || graph.find(e => e['@type'] === 'AggregateRating');
    const pageHasRating = /\d+(\.\d+)?\s*(out of|\/)\s*5|rated \d|based on \d+ review|\d+ (reviews|ratings)/i.test(htmlLower);
    if (!hasRating && pageHasRating) {
        suggestions.push({
            type: 'expansion',
            priority: 'high',
            field: 'aggregateRatingTrust',
            entity: orgEntity.name || 'Organization',
            message: 'Page has review/rating data — add aggregateRating for star snippet rich result eligibility',
            schemaHint: {
                aggregateRating: { '@type': 'AggregateRating', 'ratingValue': '4.8', 'reviewCount': 100, 'bestRating': '5' }
            }
        });
    }

    // Check for multiple locations / branches
    const pageHasBranch = /multiple locations|our offices|branch locations|serving .+ and .+/i.test(htmlLower);
    const hasBranch = orgEntity.branchOf || orgEntity.department || orgEntity.subOrganization;
    if (!hasBranch && pageHasBranch) {
        suggestions.push({
            type: 'expansion',
            priority: 'medium',
            field: 'branchRelationship',
            entity: orgEntity.name || 'Organization',
            message: 'Page suggests multiple locations/branches — consider department or subOrganization nodes for each location',
            schemaHint: {
                department: [{ '@type': 'LocalBusiness', 'name': 'Branch Name', 'address': {} }]
            }
        });
    }

    return suggestions;
}

/**
 * Step 7: Evaluate topical authority gaps.
 * Looks for important topics/concepts that should be linked entities.
 */
function evaluateTopicalAuthority(graph, html, title, url, entityClasses) {
    const suggestions = [];
    const htmlLower = (html || '').toLowerCase();
    const titleLower = (title || '').toLowerCase();

    const orgEntity = graph.find(e => {
        const t = Array.isArray(e['@type']) ? e['@type'][0] : e['@type'];
        return ['Organization','LocalBusiness','ProfessionalService','MedicalBusiness','LegalService','FinancialService'].includes(t);
    });

    // If we detect practitioners/people on a service/medical/legal page
    if ((entityClasses.medical || entityClasses.legal) && entityClasses.person) {
        const hasPerson = graph.some(e => (Array.isArray(e['@type']) ? e['@type'][0] : e['@type']) === 'Person');
        if (!hasPerson) {
            suggestions.push({
                type: 'expansion',
                priority: 'high',
                field: 'practitionerPerson',
                entity: 'Page',
                message: 'Page appears to feature a practitioner (doctor, lawyer, therapist) — add Person node with credentials, sameAs, and specialty for strong E-E-A-T',
                schemaHint: {
                    '@type': 'Person',
                    'name': 'Practitioner Name',
                    'jobTitle': 'Title',
                    'worksFor': { '@id': '#organization' },
                    'sameAs': ['https://linkedin.com/in/...'],
                    'knowsAbout': []
                }
            });
        }
    }

    // If we detect service page signals, suggest Service nodes
    if (entityClasses.service && orgEntity) {
        const hasServiceNodes = graph.some(e => (Array.isArray(e['@type']) ? e['@type'][0] : e['@type']) === 'Service');
        if (!hasServiceNodes && !orgEntity.hasOfferCatalog) {
            suggestions.push({
                type: 'expansion',
                priority: 'high',
                field: 'serviceNodes',
                entity: orgEntity.name || 'Organization',
                message: 'Service page detected without Service nodes — add dedicated Service entities with provider, areaServed, and serviceType for deeper semantic modeling',
                schemaHint: {
                    '@type': 'Service',
                    'name': 'Service Name',
                    'provider': { '@id': '#organization' },
                    'serviceType': 'Service Category',
                    'areaServed': { '@type': 'City', 'name': 'City Name' }
                }
            });
        }
    }

    // If we detect medical signals, look for condition/treatment entities
    if (entityClasses.medical) {
        const hasMedicalEntity = graph.some(e => {
            const t = Array.isArray(e['@type']) ? e['@type'][0] : e['@type'];
            return ['MedicalCondition','MedicalTreatment','MedicalTherapy','MedicalProcedure','MedicalSpecialty'].includes(t);
        });
        if (!hasMedicalEntity) {
            suggestions.push({
                type: 'expansion',
                priority: 'medium',
                field: 'medicalEntities',
                entity: 'Page',
                message: 'Medical/therapy page detected — consider MedicalCondition or MedicalTherapy nodes to strengthen clinical topic authority',
                schemaHint: {
                    '@type': 'MedicalTherapy',
                    'name': 'Treatment Name',
                    'relevantSpecialty': { '@type': 'MedicalSpecialty', 'name': 'Specialty Name' }
                }
            });
        }
    }

    // Check for video content
    if (entityClasses.video) {
        const hasVideo = graph.some(e => (Array.isArray(e['@type']) ? e['@type'][0] : e['@type']) === 'VideoObject');
        if (!hasVideo) {
            suggestions.push({
                type: 'expansion',
                priority: 'medium',
                field: 'videoObject',
                entity: 'Page',
                message: 'Embedded video detected — add VideoObject schema to enable Video rich results in Google Search',
                schemaHint: {
                    '@type': 'VideoObject',
                    'name': 'Video Title',
                    'description': 'Video description',
                    'thumbnailUrl': 'https://...',
                    'uploadDate': 'YYYY-MM-DD'
                }
            });
        }
    }

    // Check for course/event signals
    if (entityClasses.event) {
        const hasEvent = graph.some(e => {
            const t = Array.isArray(e['@type']) ? e['@type'][0] : e['@type'];
            return ['Event','Course','Webinar'].includes(t);
        });
        if (!hasEvent) {
            suggestions.push({
                type: 'expansion',
                priority: 'medium',
                field: 'eventEntity',
                entity: 'Page',
                message: 'Event/webinar/course signals detected — add Event or Course schema for rich results and Knowledge Graph visibility',
                schemaHint: {
                    '@type': 'Event',
                    'name': 'Event Name',
                    'startDate': 'YYYY-MM-DDTHH:MM',
                    'organizer': { '@id': '#organization' }
                }
            });
        }
    }

    // Check for article/blog with missing about/mentions
    const articleEntity = graph.find(e => ['Article', 'BlogPosting', 'NewsArticle'].includes(Array.isArray(e['@type']) ? e['@type'][0] : e['@type']));
    if (articleEntity && !articleEntity.about && !articleEntity.mentions) {
        suggestions.push({
            type: 'expansion',
            priority: 'high',
            field: 'articleAbout',
            entity: articleEntity.headline || 'Article',
            message: 'Article missing about/mentions — link to the primary topic entity and mentioned concepts to build topical relevance in the Knowledge Graph',
            schemaHint: {
                about: { '@type': 'Thing', 'name': 'Primary Topic', 'sameAs': 'https://en.wikipedia.org/wiki/Topic' },
                mentions: [{ '@type': 'Thing', 'name': 'Related Concept', 'sameAs': 'https://en.wikipedia.org/wiki/Concept' }]
            }
        });
    }

    // If org has no specialty signals for professional services
    const isProfService = orgEntity && ['ProfessionalService','MedicalBusiness','LegalService'].includes(
        Array.isArray(orgEntity['@type']) ? orgEntity['@type'][0] : orgEntity['@type']
    );
    if (isProfService && !orgEntity.knowsAbout) {
        suggestions.push({
            type: 'expansion',
            priority: 'high',
            field: 'professionalKnowsAbout',
            entity: orgEntity.name || 'Organization',
            message: 'Professional service org missing knowsAbout — critical for topical authority and Knowledge Graph entity definition',
            schemaHint: {
                knowsAbout: [
                    { '@type': 'Thing', 'name': 'Core Service/Topic', 'sameAs': 'https://en.wikipedia.org/wiki/...' }
                ]
            }
        });
    }

    return suggestions;
}

/**
 * Step 9: Move-the-needle self-check.
 * Returns true if expansion added meaningful entities/relationships.
 */
function needsMoreWork(expansionSuggestions) {
    const highPriority = expansionSuggestions.filter(s => s.priority === 'high');
    return highPriority.length > 0;
}

/**
 * MAIN: Run Entity Expansion & Strategic Schema Modeling (all 9 steps).
 * Returns { expansionSuggestions, entityClasses, trustGaps, topicalGaps }
 */
function runEntityExpansion(graph, url, title, html, metaDesc) {
    const entityClasses = detectEntityClasses(url, title, html);
    const baseUrl = (() => { try { return new URL(url).origin; } catch(e) { return ''; } })();

    // Step 4: Expand shallow strings in existing graph entities
    graph.forEach(entity => expandShallowStrings(entity, baseUrl));

    // Step 6: Trust & authority gaps
    const trustSuggestions = evaluateTrustGaps(graph, html, url);

    // Step 7: Topical authority gaps
    const topicalSuggestions = evaluateTopicalAuthority(graph, html, title, url, entityClasses);

    // Combine all expansion suggestions
    const expansionSuggestions = [...trustSuggestions, ...topicalSuggestions];

    // Step 9: Move-the-needle self-check
    const needsWork = needsMoreWork(expansionSuggestions);

    return {
        expansionSuggestions,
        entityClasses,
        needsWork,
        summary: {
            totalSuggestions: expansionSuggestions.length,
            highPriority: expansionSuggestions.filter(s => s.priority === 'high').length,
            mediumPriority: expansionSuggestions.filter(s => s.priority === 'medium').length,
            lowPriority: expansionSuggestions.filter(s => s.priority === 'low').length,
            detectedClasses: Object.keys(entityClasses).filter(k => entityClasses[k])
        }
    };
}

// ============================================================
// END ENTITY EXPANSION & STRATEGIC SCHEMA MODELING MODULE
// ============================================================

function enhanceSchema(entities, url, title, html, metaDesc) {
    // baseUrl should be domain root for @id consistency
    const _urlObj = (() => { try { return new URL(url); } catch(e) { return null; } })();
    const baseUrl = _urlObj ? _urlObj.origin : url.replace(/\/+$/,'');
    const graph = [];
    const changes = [];
    const addedProps = new Set(); // Track which properties were added for diff highlighting
    
    // Track what entity types we have
    let hasOrg = false, hasLocalBusiness = false, hasPerson = false;
    let primaryEntity = null;
    let orgEntity = null;
    
    // Reset primary org tracking for this run
    window._primaryOrgEntityName = null;
    window._primaryOrgEntity = null;
    
    // Detect page type from HTML for smart suggestions
    const pageHtml = html || '';
    const pageTypeAnalysis = html ? detectPageType(url, title, metaDesc || '', html, html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["'](.*?)["']/i)?.[1] || '', []) : null;
    
    // First pass: enhance existing entities
    entities.forEach((e,i) => {
        const enhanced = {...e};
        const entityName = e.name || e['@type'] || `Entity ${i+1}`;
        const entityType = Array.isArray(e['@type']) ? e['@type'][0] : e['@type'];
        
        // Track entity types (trim to handle any whitespace from JSON parsing)
        const etType = (entityType || '').toString().trim();
        if (['Organization','ProfessionalService','MedicalBusiness','LegalService','FinancialService'].includes(etType)) {
            hasOrg = true;
            orgEntity = enhanced;
        }
        if (['LocalBusiness','Store','Restaurant','AutoRepair','BeautySalon','Dentist','Hospital','Pharmacy','VeterinaryCare'].includes(etType)) {
            hasLocalBusiness = true;
            orgEntity = enhanced;
        }
        if (etType === 'Person') hasPerson = true;
        
        if (!primaryEntity && (hasOrg || hasLocalBusiness || entityType === 'WebPage' || entityType === 'Article' || entityType === 'BlogPosting' || entityType === 'NewsArticle')) {
            primaryEntity = enhanced;
        }
        
        // Add @id if missing — use clean type-based IDs, NOT page title slugs
        if (!enhanced['@id']) {
            let entityId;
            const orgTypes = ['Organization','LocalBusiness','ProfessionalService','MedicalBusiness','LegalService','FinancialService','Store','Restaurant','Hotel'];
            const articleTypes = ['Article','BlogPosting','NewsArticle'];
            if (entityType === 'WebSite') {
                entityId = baseUrl + '/#website';
            } else if (orgTypes.includes(entityType)) {
                entityId = baseUrl + '/#organization';
            } else if (articleTypes.includes(entityType)) {
                // For articles, use the page URL + fragment
                entityId = (enhanced.url || url) + '#' + entityType.toLowerCase();
            } else if (entityType === 'WebPage') {
                entityId = enhanced.url || url;
            } else if (entityType === 'Person') {
                const personSlug = entityName.toLowerCase().replace(/[^a-z0-9]+/g,'-');
                entityId = baseUrl + '/#person-' + personSlug;
            } else {
                // For other types (Product, FAQPage, HowTo, etc.) use type-only fragment
                entityId = baseUrl + '/#' + entityType.toLowerCase();
            }
            enhanced['@id'] = entityId;
            enhanced.__addedFields = enhanced.__addedFields || [];
            enhanced.__addedFields.push('@id');
            changes.push({type: 'add', field: '@id', entity: entityName, value: enhanced['@id'], message: `Added @id to ${entityType}`});
        }
        
        // Add mainEntityOfPage only for content entities (Article, BlogPosting, etc.), NOT for Organization/WebSite
        const contentTypes = ['Article','BlogPosting','NewsArticle','Product','FAQPage','HowTo','Recipe','Event','Course'];
        const isContentEntity = contentTypes.includes(entityType) || contentTypes.some(t => Array.isArray(enhanced['@type']) && enhanced['@type'].includes(t));
        if (isContentEntity && !enhanced.mainEntityOfPage && (enhanced.url || url)) {
            // Use the specific page URL (not baseUrl) — the canonical URL of the page this content is about
            const pageUrl = enhanced.url || url;
            enhanced.mainEntityOfPage = {"@type":"WebPage","@id":pageUrl};
            enhanced.__addedFields = enhanced.__addedFields || [];
            enhanced.__addedFields.push('mainEntityOfPage');
            changes.push({type: 'add', field: 'mainEntityOfPage', entity: entityName, message: `Added mainEntityOfPage pointing to page URL`});
        }
        
        // Add URL if missing
        if (!enhanced.url && (entityType === 'Organization' || entityType === 'LocalBusiness' || hasOrg || hasLocalBusiness)) {
            enhanced.url = url;
            enhanced.__addedFields = enhanced.__addedFields || [];
            enhanced.__addedFields.push('url');
            changes.push({type: 'add', field: 'url', entity: entityName, message: `Added url to "${entityName}"`});
        }
        
        // Track that this is an org entity for later suggestion generation
        if (hasOrg || hasLocalBusiness) {
            // Store the primary org entity name for suggestions (first org found)
            if (!window._primaryOrgEntityName) {
                window._primaryOrgEntityName = entityName;
                window._primaryOrgEntity = enhanced;
            }
        }
        
        graph.push(enhanced);
    });
    
    // Add WebSite entity if missing
    const existingWebSite = graph.find(e => e['@type']==='WebSite');
    if (!existingWebSite) {
        const websiteId = baseUrl + '/#website';
        const website = {
            "@type":"WebSite",
            "@id":websiteId,
            "name":title,
            "url":baseUrl,
            "publisher":orgEntity ? {"@id":orgEntity['@id']} : undefined,
            __isNew__: true
        };
        graph.unshift(website);
        changes.push({type: 'create', field: 'WebSite', message: `Created WebSite entity with @id "${websiteId}"`});
    } else if (orgEntity && !existingWebSite.publisher) {
        existingWebSite.publisher = {"@id":orgEntity['@id']};
        existingWebSite.__addedFields = existingWebSite.__addedFields || [];
        existingWebSite.__addedFields.push('publisher');
        changes.push({type: 'add', field: 'publisher', entity: 'WebSite', message: `Linked WebSite publisher to Organization`});
    }
    
    // Add Organization entity if missing
    if (!hasOrg && !hasLocalBusiness) {
        const orgId = baseUrl + '/#organization';
        const org = {
            "@type":"Organization",
            "@id":orgId,
            "name":title,
            "url":baseUrl,
            __isNew__: true
        };
        graph.unshift(org);
        changes.push({type: 'create', field: 'Organization', message: `Created Organization entity with @id "${orgId}"`});
        orgEntity = org;
        // Set hasOrg so suggestions will be generated for this new Organization
        hasOrg = true;
        window._primaryOrgEntity = org;
        window._primaryOrgEntityName = title;
        const website = graph.find(e => e['@type']==='WebSite');
        if (website && !website.publisher) {
            website.publisher = {"@id":orgId};
            website.__addedFields = website.__addedFields || [];
            website.__addedFields.push('publisher');
            changes.push({type: 'add', field: 'publisher', entity: 'WebSite', message: `Linked WebSite publisher to Organization`});
        }
    }
    
    // Generate suggestions for the Organization (either existing or newly created)
    // This is placed AFTER Organization creation so suggestions work for newly created orgs too
    const primaryOrg = window._primaryOrgEntity || orgEntity || entities[0] || {};
    const primaryName = window._primaryOrgEntityName || (orgEntity && orgEntity.name) || (entities[0] && (entities[0].name || entities[0]['@type'])) || 'your organization';
    
    
    // ─────────────────────────────────────────────────────────────────────────
    // PAGE-TYPE AWARE SUGGESTIONS
    // Analyze the page type from HTML and suggest appropriate schema additions
    // ─────────────────────────────────────────────────────────────────────────
    if (pageTypeAnalysis) {
        const urlLower = url.toLowerCase();
        const existingTypes = graph.map(e => Array.isArray(e['@type']) ? e['@type'][0] : e['@type']);
        const hasBlogPosting = existingTypes.includes('BlogPosting') || existingTypes.includes('Article') || existingTypes.includes('NewsArticle');
        const hasProduct = existingTypes.includes('Product');
        const hasFAQ = existingTypes.includes('FAQPage');
        const hasHowTo = existingTypes.includes('HowTo');
        const hasBreadcrumb = existingTypes.includes('BreadcrumbList');
        const hasRecipe = existingTypes.includes('Recipe');
        const hasEvent = existingTypes.includes('Event');
        const detectedType = pageTypeAnalysis.primaryType;
        
        // Detect article/blog page from URL pattern & content even if no schema exists yet
        const isBlogUrl = /\/blog\/|\/post\/|\/article\/|\/news\/|\/\d{4}\/\d{2}\//i.test(urlLower);
        const isArticleContent = pageHtml && /<article|class=["'][^"']*post[^"']*["']|class=["'][^"']*article[^"']*["']|<time[^>]*datetime/i.test(pageHtml);
        const isHowToContent = /how[-_ ]to|guide|tutorial|step[- ]by[- ]step|checklist/i.test(title || '') || /\/how[-_]?to\/|\/guide\/|\/tutorial\//i.test(urlLower);
        const isFAQContent = /faq|frequently.asked|questions? and answers?/i.test(title || '') || /\/faq|\/help\//i.test(urlLower);
        const isProductUrl = /\/product\/|\/shop\/|\/store\/|\/item\//i.test(urlLower);
        const isServiceUrl = /\/service\/|\/services\//i.test(urlLower);
        
        const pageIsArticleLike = hasBlogPosting || isBlogUrl || isArticleContent || 
                                   ['BlogPosting','Article','NewsArticle'].includes(detectedType);
        
        // ── SCHEMA SELF-VERIFICATION: validate each candidate before suggesting ──

        // SUGGEST BLOGPOSTING / ARTICLE — verified by URL + content signals
        if (!hasBlogPosting && pageIsArticleLike) {
            const suggestedType = isBlogUrl ? 'BlogPosting' : 'Article';
            // BlogPosting/Article don't have a strict blacklist check, but require content signals
            const blogConfidence = (isBlogUrl ? 0.4 : 0) + (isArticleContent ? 0.3 : 0) + 
                                   (['BlogPosting','Article','NewsArticle'].includes(detectedType) ? 0.3 : 0);
            const blogValidation = validateSchemaCandidate(suggestedType, pageHtml, title, url, Math.min(blogConfidence + 0.2, 1.0));
            if (blogValidation.valid) {
                changes.push({
                    type: 'suggest', field: 'addBlogPosting', entity: title, 
                    message: `Add ${suggestedType} schema — this appears to be a blog/article page`, 
                    entityName: title
                });
            }
        }
        
        // ARTICLE-SPECIFIC SUGGESTIONS (if already has article schema or we detected article content)
        if (pageIsArticleLike || hasBlogPosting) {
            const articleEntity = graph.find(e => ['Article','BlogPosting','NewsArticle'].includes(
                Array.isArray(e['@type']) ? e['@type'][0] : e['@type']
            ));
            
            if (!articleEntity || !articleEntity.author) {
                changes.push({type:'suggest', field:'articleAuthor', entity: title, 
                    message:'Add author Person schema with sameAs links (critical for E-E-A-T)', entityName: title});
            }
            if (!articleEntity || !articleEntity.datePublished) {
                changes.push({type:'suggest', field:'articleDate', entity: title, 
                    message:'Add datePublished & dateModified (required for article rich results)', entityName: title});
            }
            if (!articleEntity || !articleEntity.image) {
                changes.push({type:'suggest', field:'articleImage', entity: title, 
                    message:'Add article image (required for Google Discover & rich results)', entityName: title});
            }
        }
        
        // SUGGEST BREADCRUMBLIST if missing and it's a sub-page
        if (!hasBreadcrumb && url !== baseUrl && url !== baseUrl + '/' && (isBlogUrl || isProductUrl || isServiceUrl || pageIsArticleLike)) {
            changes.push({type:'suggest', field:'addBreadcrumb', entity: title, 
                message:'Add BreadcrumbList schema — improves navigation rich results', entityName: title});
        }
        
        // SUGGEST HOWTO — verified: requires actual step structure in HTML (not just "guide" in title)
        if (!hasHowTo && isHowToContent) {
            const howToValidation = validateSchemaCandidate('HowTo', pageHtml, title, url, 0.8);
            if (howToValidation.valid) {
                changes.push({type:'suggest', field:'addHowTo', entity: title, 
                    message:'Add HowTo schema — Google shows step-by-step rich results for guides & checklists', entityName: title});
            }
            // If blacklisted (no step structure found), silently skip — avoid recommending HowTo for general "guide" articles
        }
        
        // SUGGEST FAQPAGE — verified: requires visible Q&A structure in HTML (not just "FAQ" in title)
        if (!hasFAQ && isFAQContent) {
            const faqValidation = validateSchemaCandidate('FAQPage', pageHtml, title, url, 0.8);
            if (faqValidation.valid) {
                changes.push({type:'suggest', field:'addFAQPage', entity: title, 
                    message:'Add FAQPage schema — enables rich results with expanded Q&A snippets', entityName: title});
            }
            // If blacklisted (no Q&A structure found), silently skip — avoid recommending FAQPage for pages that just mention FAQs
        }
        
        // SUGGEST PRODUCT — verified: requires product URL pattern or actual product HTML signals
        if (!hasProduct && isProductUrl) {
            const productValidation = validateSchemaCandidate('Product', pageHtml, title, url, 0.75);
            if (productValidation.valid) {
                changes.push({type:'suggest', field:'addProduct', entity: title, 
                    message:'Add Product schema with price & availability for shopping rich results', entityName: title});
            }
        }
    }

    if (hasOrg || hasLocalBusiness) {
        // Only add each suggestion type once, for the primary entity
        const suggFields = new Set(changes.filter(c=>c.type==='suggest').map(c=>c.field));
        
        // Log why each suggestion is or isn't added
        
        // sameAs suggestion: show if missing OR if fewer than 5 links OR if missing authoritative links
        const sameAsLinks = Array.isArray(primaryOrg.sameAs) ? primaryOrg.sameAs : (primaryOrg.sameAs ? [primaryOrg.sameAs] : []);
        const sameAsCount = sameAsLinks.length;
        // Check for authoritative links (Wikipedia, Wikidata, BBB, Crunchbase, GMB, Yelp, industry directories)
        const authoritativePatterns = [
            /wikipedia\.org/i, /wikidata\.org/i, /bbb\.org/i, /crunchbase\.com/i,
            /maps\.google\.com|google\.com\/maps|goo\.gl\/maps|g\.page/i,
            /yelp\.com\/biz/i, /yellowpages\.com/i, /superpages\.com/i,
            /tripadvisor\.com/i, /glassdoor\.com/i, /angel\.co/i, /inc\.com/i,
            /forbes\.com/i, /techcrunch\.com/i, /nytimes\.com/i, /press|news|article/i
        ];
        const hasAuthoritativeLink = sameAsLinks.some(link => 
            authoritativePatterns.some(pattern => pattern.test(link))
        );
        const needsMoreSameAs = sameAsCount < 5 || (sameAsCount > 0 && !hasAuthoritativeLink);
        
        if (!suggFields.has('sameAs') && needsMoreSameAs) {
            let msg = sameAsCount === 0 
                ? 'Add sameAs links (social profiles, directories, Wikipedia)'
                : sameAsCount < 5 
                    ? `Expand sameAs links (${sameAsCount} found, recommend 5+)`
                    : 'Add authoritative sameAs links (Wikipedia, BBB, news mentions)';
            changes.push({type:'suggest', field:'sameAs', entity:primaryName, message:msg, entityName:primaryName});
        }
        if (!primaryOrg.knowsAbout && !suggFields.has('knowsAbout'))
            changes.push({type:'suggest', field:'knowsAbout', entity:primaryName, message:`Add knowsAbout (entity topics, Wikipedia/Wikidata links)`, entityName:primaryName});
        if (!primaryOrg.areaServed && !suggFields.has('areaServed'))
            changes.push({type:'suggest', field:'areaServed', entity:primaryName, message:`Add areaServed with geo-circle service radius`, entityName:primaryName});
        if (!primaryOrg.potentialAction && !suggFields.has('potentialAction'))
            changes.push({type:'suggest', field:'potentialAction', entity:primaryName, message:`Add potentialAction (Contact form, Phone, Reserve CTA)`, entityName:primaryName});
        if (!primaryOrg.founder && !primaryOrg.employee && !hasPerson && !suggFields.has('founder'))
            changes.push({type:'suggest', field:'founder', entity:primaryName, message:`Add founder/employee Person schemas (builds E-E-A-T)`, entityName:primaryName});
        if (!primaryOrg.hasOfferCatalog && !suggFields.has('hasOfferCatalog'))
            changes.push({type:'suggest', field:'hasOfferCatalog', entity:primaryName, message:`Add hasOfferCatalog with your services list`, entityName:primaryName});
        if (!primaryOrg.aggregateRating && !suggFields.has('aggregateRating'))
            changes.push({type:'suggest', field:'aggregateRating', entity:primaryName, message:`Add aggregateRating (star ratings from reviews)`, entityName:primaryName});
        // mentions - One of the FOUR most important properties (per YouTube advanced schema research)
        if (!primaryOrg.mentions && !suggFields.has('mentions'))
            changes.push({type:'suggest', field:'mentions', entity:primaryName, message:`Add mentions (link to competitors, partners, tools - builds Knowledge Graph connections)`, entityName:primaryName});
    }
    
    // Generate suggestions for Article/BlogPosting types
    const articleEntity = graph.find(e => ['Article', 'BlogPosting', 'NewsArticle'].includes(e['@type']));
    if (articleEntity) {
        const articleName = articleEntity.headline || articleEntity.name || 'Article';
        
        // Author suggestion
        if (!articleEntity.author) {
            changes.push({type:'suggest', field:'articleAuthor', entity:articleName, message:`Add author Person schema (builds E-E-A-T)`, entityName:articleName});
        }
        
        // Publisher suggestion - should link to Organization
        if (!articleEntity.publisher) {
            changes.push({type:'suggest', field:'articlePublisher', entity:articleName, message:`Add publisher Organization link`, entityName:articleName});
        }
        
        // Image suggestion
        if (!articleEntity.image) {
            changes.push({type:'suggest', field:'articleImage', entity:articleName, message:`Add article image (required for rich results)`, entityName:articleName});
        }
        
        // Date suggestion
        if (!articleEntity.datePublished) {
            changes.push({type:'suggest', field:'articleDate', entity:articleName, message:`Add publish date for article schema`, entityName:articleName});
        }
        
        // mainEntityOfPage — set directly on the article entity, pointing to the canonical page URL
        if (!articleEntity.mainEntityOfPage) {
            const articlePageUrl = articleEntity.url || url;
            if (articlePageUrl) {
                articleEntity.mainEntityOfPage = {"@type":"WebPage","@id":articlePageUrl};
                articleEntity.__addedFields = articleEntity.__addedFields || [];
                articleEntity.__addedFields.push('mainEntityOfPage');
                changes.push({type:'add', field:'mainEntityOfPage', entity:articleName, message:`Added mainEntityOfPage linking article to its canonical page URL`});
            }
        }
        
        // Speakable specification for voice search
        changes.push({type:'suggest', field:'speakable', entity:articleName, message:`Add speakable specification for voice search`, entityName:articleName});
    }
    
    // Suggest FAQPage for articles that might benefit from FAQs
    if (articleEntity && !graph.find(e => e['@type'] === 'FAQPage')) {
        changes.push({type:'suggest', field:'faqSection', entity:'Article', message:`Add FAQPage schema (⚠️ only if visible FAQ content exists on page)`, entityName:'this article'});
    }
    
    // Suggest HowTo for tutorial/how-to content
    if (!graph.find(e => e['@type'] === 'HowTo') && articleEntity && (title && /how.to|guide|tutorial|step.by.step/i.test(title))) {
        changes.push({type:'suggest', field:'howToSchema', entity:'Article', message:`Add HowTo schema for tutorial content`, entityName:'this guide'});
    }
    
    // Add SearchAction to WebSite
    const website = graph.find(e => e['@type']==='WebSite');
    if (website && !website.potentialAction) {
        website.potentialAction = {
            "@type":"SearchAction",
            "target":{"@type":"EntryPoint","urlTemplate":baseUrl+"/search?q={search_term_string}"},
            "query-input":"required name=search_term_string"
        };
        website.__addedFields = website.__addedFields || [];
        website.__addedFields.push('potentialAction');
        changes.push({type: 'add', field: 'potentialAction (SearchAction)', entity: 'WebSite', message: `Added SearchAction to WebSite for sitelinks searchbox`});
    }
    
    // Link entities together
    graph.forEach(entity => {
        const entityType = Array.isArray(entity['@type']) ? entity['@type'][0] : entity['@type'];
        if (entityType === 'Service' && !entity.provider && orgEntity) {
            entity.provider = {"@id":orgEntity['@id']};
            entity.__addedFields = entity.__addedFields || [];
            entity.__addedFields.push('provider');
            changes.push({type: 'add', field: 'provider', entity: entity.name || entityType, message: `Linked Service "${entity.name||entityType}" to Organization via provider`});
        }
        if (entityType === 'Product' && !entity.brand && orgEntity) {
            entity.brand = {"@id":orgEntity['@id']};
            entity.__addedFields = entity.__addedFields || [];
            entity.__addedFields.push('brand');
            changes.push({type: 'add', field: 'brand', entity: entity.name || entityType, message: `Linked Product to Organization via brand`});
        }
        if ((entityType === 'Article' || entityType === 'BlogPosting' || entityType === 'NewsArticle') && !entity.publisher && orgEntity) {
            entity.publisher = {"@id":orgEntity['@id']};
            entity.__addedFields = entity.__addedFields || [];
            entity.__addedFields.push('publisher');
            changes.push({type: 'add', field: 'publisher', entity: entity.name || entityType, message: `Linked Article to Organization via publisher`});
        }
        if (entityType === 'FAQPage' && !entity.mainEntityOfPage) {
            entity.mainEntityOfPage = {"@type":"WebPage","@id":url};
            entity.__addedFields = entity.__addedFields || [];
            entity.__addedFields.push('mainEntityOfPage');
            changes.push({type: 'add', field: 'mainEntityOfPage', entity: 'FAQPage', message: `Added mainEntityOfPage to FAQPage`});
        }
    });
    
    // Add BreadcrumbList
    if (!graph.find(e => e['@type']==='BreadcrumbList')) {
        graph.push({
            "@type":"BreadcrumbList",
            "@id":baseUrl+'/#breadcrumb',
            "itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":baseUrl}],
            __isNew__: true
        });
        changes.push({type: 'create', field: 'BreadcrumbList', message: `Created BreadcrumbList for internal linking`});
    }
    
    // Sort graph: WebSite first, then Org, then others
    graph.sort((a, b) => {
        const typeOrder = {'WebSite':1,'Organization':2,'LocalBusiness':2,'ProfessionalService':2};
        const aT = Array.isArray(a['@type'])?a['@type'][0]:a['@type'];
        const bT = Array.isArray(b['@type'])?b['@type'][0]:b['@type'];
        return (typeOrder[aT]||99)-(typeOrder[bT]||99);
    });

    // ── SCHEMA SELF-VERIFICATION: Step 6 — Self-Correction Pass ──
    // Remove speculative/duplicate suggestions, prefer fewer accurate schema types
    const verifiedChanges = selfCorrectSuggestions(changes, html || '', title || '', url || '');

    // ── ENTITY EXPANSION & STRATEGIC SCHEMA MODELING ──
    // Run the 9-step deep entity check after all baseline enhancements
    const entityExpansion = runEntityExpansion(graph, url || '', title || '', html || '', metaDesc || '');
    
    return {"@context":"https://schema.org","@graph":graph, _changes: verifiedChanges, _expansion: entityExpansion};
}

/**
 * Render the Entity Expansion & Strategic Schema Modeling panel.
 * Shows detected entity classes, trust gaps, topical gaps, and expansion suggestions.
 */
// ============================================================
// UNIFIED SUGGESTIONS PANEL
// Combines Suggested Enhancements + Entity Expansion
// into one clean, unified, labeled panel
// ============================================================
function renderUnifiedSuggestionsPanel(changes, expansion) {
    const actualChanges = (changes || []).filter(c => c.type !== 'suggest');
    const suggestions = (changes || []).filter(c => c.type === 'suggest');
    const expSuggestions = (expansion && expansion.expansionSuggestions) ? expansion.expansionSuggestions : [];

    const totalCount = suggestions.length + expSuggestions.length;
    const hasSomething = actualChanges.length > 0 || suggestions.length > 0 || expSuggestions.length > 0;
    if (!hasSomething) return '';

    const priorityColor = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
    const priorityLabel = { high: 'High Impact', medium: 'Medium Impact', low: 'Low Impact' };
    const priorityIcon  = { high: '🔴', medium: '🟡', low: '🔵' };

    // Render a single entity expansion item
    const renderExpItem = (s) => {
        const hasWizard = !!SUGGESTION_WIZARDS[s.field];
        const generateBtn = hasWizard
            ? `<button class="btn btn-generate btn-sm" onclick="openSuggestionWizard('${s.field}','${escapeHtml(s.entity||'')}')">⚡ Generate</button>`
            : `<button class="btn btn-info btn-sm" onclick="showSuggestionInfo('${escapeHtml(s.field)}')">ℹ️ Info</button>`;
        const pColor = priorityColor[s.priority] || '#64748b';
        const pLabel = priorityLabel[s.priority] || '';
        const pIcon  = priorityIcon[s.priority] || '⚪';
        return `
        <li class="unified-suggestion-item" style="border-left:3px solid ${pColor};">
            <div class="usi-row">
                <span class="usi-icon">${pIcon}</span>
                <div class="usi-body">
                    <span class="usi-title">${escapeHtml(s.message)}</span>
                    <span class="usi-badge" style="background:${pColor}18;color:${pColor};border:1px solid ${pColor}44;">${pLabel}</span>
                    ${generateBtn}
                </div>
            </div>
            ${s.description ? `<p class="usi-desc">${escapeHtml(s.description)}</p>` : ''}
            ${s.schemaHint ? `<details class="usi-hint"><summary>View Schema Hint</summary><pre>${escapeHtml(JSON.stringify(s.schemaHint, null, 2))}</pre></details>` : ''}
        </li>`;
    };

    // Render a single suggestion item
    const renderSugItem = (c) => {
        const hasWizard = !!SUGGESTION_WIZARDS[c.field];
        const generateBtn = hasWizard
            ? `<button class="btn btn-generate btn-sm" onclick="openSuggestionWizard('${c.field}','${escapeHtml(c.entityName||'')}')">⚡ Generate</button>`
            : `<button class="btn btn-info btn-sm" onclick="showSuggestionInfo('${escapeHtml(c.field)}')">ℹ️ Info</button>`;
        return `
        <li class="unified-suggestion-item" style="border-left:3px solid #a855f7;">
            <div class="usi-row">
                <span class="usi-icon">💡</span>
                <div class="usi-body">
                    <span class="usi-title">${escapeHtml(c.message)}</span>
                    ${generateBtn}
                </div>
            </div>
        </li>`;
    };

    // Render an auto-applied change item
    const renderChangeItem = (c) => {
        const icon = c.type === 'add' ? '✅' : c.type === 'create' ? '🆕' : '✏️';
        const color = c.type === 'create' ? '#10b981' : '#3b82f6';
        return `
        <li class="unified-suggestion-item" style="border-left:3px solid ${color};">
            <div class="usi-row">
                <span class="usi-icon">${icon}</span>
                <div class="usi-body">
                    <span class="usi-title">${escapeHtml(c.message)}</span>
                    <span class="usi-badge" style="background:${color}18;color:${color};border:1px solid ${color}44;">${c.type === 'create' ? 'New Entity' : 'Auto-Applied'}</span>
                </div>
            </div>
        </li>`;
    };

    // Build entity class chips for expansion header
    const detectedClassChips = (expansion && expansion.entityClasses
        ? Object.keys(expansion.entityClasses).filter(k => expansion.entityClasses[k])
        : (expansion && expansion.summary ? expansion.summary.detectedClasses : [])
    ).map(cls => `<span class="usi-class-chip">${cls}</span>`).join('');

    // Group expansion items by priority
    const highItems = expSuggestions.filter(s => s.priority === 'high');
    const medItems  = expSuggestions.filter(s => s.priority === 'medium');
    const lowItems  = expSuggestions.filter(s => s.priority === 'low');

    return `
<div class="unified-suggestions-panel">

    <!-- SECTION: Auto-Applied Changes -->
    ${actualChanges.length > 0 ? `
    <div class="usp-section">
        <div class="usp-section-header">
            <span class="usp-section-icon">🔧</span>
            <h4 class="usp-section-title">Auto-Applied Enhancements</h4>
            <span class="usp-count-badge">${actualChanges.length}</span>
            <div class="usp-section-actions">
                <span class="usp-verified-badge">✅ VERIFIED</span>
                <button class="btn btn-ghost btn-xs" onclick="copyChangesList()">📋 Copy List</button>
            </div>
        </div>
        <ul class="unified-suggestion-list">
            ${actualChanges.map(renderChangeItem).join('')}
        </ul>
    </div>` : ''}

    <!-- SECTION: Suggested Enhancements -->
    ${suggestions.length > 0 ? `
    <div class="usp-section">
        <div class="usp-section-header">
            <span class="usp-section-icon">💡</span>
            <h4 class="usp-section-title">Suggested Enhancements</h4>
            <span class="usp-count-badge">${suggestions.length}</span>
            <div class="usp-section-actions">
                <span class="usp-verified-badge">✅ VERIFIED</span>
            </div>
        </div>
        <p class="usp-section-desc">Click <strong>⚡ Generate</strong> next to any suggestion to open a guided wizard and add it to your schema.</p>
        <ul class="unified-suggestion-list">
            ${suggestions.map(renderSugItem).join('')}
        </ul>
    </div>` : ''}

    <!-- SECTION: Entity Expansion & Strategic Schema Modeling -->
    ${expSuggestions.length > 0 ? `
    <div class="usp-section">
        <div class="usp-section-header">
            <span class="usp-section-icon">🏗️</span>
            <h4 class="usp-section-title">Entity Expansion & Strategic Schema Modeling</h4>
            <span class="usp-count-badge">${expSuggestions.length}</span>
            <div class="usp-section-actions">
                ${expansion && expansion.needsWork
                    ? `<span class="usp-alert-badge">⚠️ High-impact gaps found</span>`
                    : `<span class="usp-good-badge">✅ Good baseline</span>`}
            </div>
        </div>
        <p class="usp-section-desc">Model missing entities, relationships, and semantic structure for stronger Knowledge Graph presence. Click <strong>⚡ Generate</strong> to open a wizard with auto-scanned data.</p>
        ${detectedClassChips ? `<div class="usp-chips"><span class="usp-chips-label">Detected classes:</span>${detectedClassChips}</div>` : ''}
        ${highItems.length > 0 ? `
        <div class="usp-priority-group">
            <span class="usp-priority-label" style="color:#ef4444;">🔴 High Impact</span>
            <ul class="unified-suggestion-list">${highItems.map(renderExpItem).join('')}</ul>
        </div>` : ''}
        ${medItems.length > 0 ? `
        <div class="usp-priority-group">
            <span class="usp-priority-label" style="color:#f59e0b;">🟡 Medium Impact</span>
            <ul class="unified-suggestion-list">${medItems.map(renderExpItem).join('')}</ul>
        </div>` : ''}
        ${lowItems.length > 0 ? `
        <div class="usp-priority-group">
            <span class="usp-priority-label" style="color:#3b82f6;">🔵 Low Impact</span>
            <ul class="unified-suggestion-list">${lowItems.map(renderExpItem).join('')}</ul>
        </div>` : ''}
    </div>` : ''}

</div>`;
}

// Keep legacy function for backward compat (just calls the new one)
function renderEntityExpansionPanel(exp) {
    return renderUnifiedSuggestionsPanel([], exp);
}

// Build diff-highlighted JSON string
function buildDiffJSON(graphWithMeta) {
    const lines = [];
    lines.push('{');
    lines.push('  "@context": "https://schema.org",');
    lines.push('  "@graph": [');
    
    const graph = graphWithMeta['@graph'];
    graph.forEach((entity, ei) => {
        const isNew = entity.__isNew__;
        const addedFields = new Set(entity.__addedFields || []);
        
        // Strip meta props
        const clean = {};
        for (const [k,v] of Object.entries(entity)) {
            if (k === '__isNew__' || k === '__addedFields__' || k === '__addedFields') continue;
            if (v === undefined || v === null || v === '') continue;
            clean[k] = v;
        }
        
        const entityJson = JSON.stringify(clean, null, 2);
        const entityLines = entityJson.split('\n');
        
        let entityHtml = '';
        entityLines.forEach((line, li) => {
            const keyMatch = line.match(/^(\s*)"([^"]+)"\s*:/);
            let highlighted = syntaxHighlight(line);
            
            if (isNew) {
                // Entire entity is new - wrap in green
                highlighted = `<span class="diff-new">${highlighted}</span>`;
            } else if (keyMatch) {
                const propKey = keyMatch[2];
                if (addedFields.has(propKey)) {
                    // This specific property was added - wrap in blue
                    highlighted = `<span class="diff-added">${highlighted}</span>`;
                }
            }
            entityHtml += highlighted + '\n';
        });
        
        // Indent by 4
        const indented = entityHtml.split('\n').map(l => l ? '    ' + l : l).join('\n');
        lines.push(indented.trimEnd() + (ei < graph.length-1 ? ',' : ''));
    });
    
    lines.push('  ]');
    lines.push('}');
    return lines.join('\n');
}

function generateFromMeta(url, title, desc, html) {
    // baseUrl should be the domain root (https://example.com), not the full page URL
    const urlObj = (() => { try { return new URL(url); } catch(e) { return null; } })();
    const baseUrl = urlObj ? urlObj.origin : url.replace(/\/+$/,'');
    const graph = [];

    // Extract OG data
    const ogType = (html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["'](.*?)["']/i)||[])[1]||'';
    const ogImage = (html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/i)||[])[1];
    const ogSiteName = (html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["'](.*?)["']/i)||[])[1];
    const ogArticlePublished = (html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["'](.*?)["']/i)||[])[1];
    const ogArticleModified = (html.match(/<meta[^>]*property=["']article:modified_time["'][^>]*content=["'](.*?)["']/i)||[])[1];
    const ogArticleAuthor = (html.match(/<meta[^>]*property=["']article:author["'][^>]*content=["'](.*?)["']/i)||[])[1];
    const ogArticleSection = (html.match(/<meta[^>]*property=["']article:section["'][^>]*content=["'](.*?)["']/i)||[])[1];
    
    // Extract JSON-LD structured data hints
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    
    // Analyze page content to detect page type
    const pageTypeAnalysis = detectPageType(url, title, desc, html, ogType, jsonLdMatches);
    
    // Always add WebSite
    graph.push({"@type":"WebSite","@id":baseUrl+'/#website',"name":ogSiteName||title,"url":baseUrl});
    
    // Add Organization if we have a site name
    if (ogSiteName) {
        graph.push({"@type":"Organization","@id":baseUrl+'/#organization',"name":ogSiteName,"url":baseUrl});
    }
    
    // Add primary entity based on detected page type
    const primaryEntity = createPrimaryEntity(pageTypeAnalysis, url, title, desc, ogImage, ogArticlePublished, ogArticleModified, ogArticleAuthor, baseUrl);
    if (primaryEntity) {
        graph.push(primaryEntity);
    }
    
    // Add BreadcrumbList if we detected navigation structure
    if (pageTypeAnalysis.hasBreadcrumbs) {
        graph.push(createBreadcrumbEntity(url, pageTypeAnalysis.breadcrumbs, baseUrl));
    }
    
    return {"@context":"https://schema.org","@graph":cleanObj(graph)};
}

// Detect the type of page based on URL, content, and metadata
function detectPageType(url, title, desc, html, ogType, jsonLdMatches) {
    const analysis = {
        primaryType: 'WebPage',
        secondaryTypes: [],
        confidence: 0,
        hasBreadcrumbs: false,
        breadcrumbs: [],
        articleData: null,
        productData: null,
        serviceData: null,
        localBusinessData: null,
        faqData: null,
        howToData: null
    };
    
    const urlLower = url.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    const descLower = (desc || '').toLowerCase();
    const htmlLower = html.toLowerCase();
    
    // Check OG:type first (high confidence indicator)
    if (ogType === 'article' || ogType === 'blog') {
        analysis.primaryType = 'Article';
        analysis.confidence = 0.9;
    }
    
    // URL pattern detection
    const urlPatterns = {
        blogPost: /\/blog\/|\/post\/|\/article\/|\/news\/|\/\d{4}\/\d{2}\/|\/\d{4}\/\d{2}\/\d{2}\//i,
        product: /\/product\/|\/products\/|\/shop\/|\/store\/|\/item\/|\/p\/|\/buy\//i,
        service: /\/service\/|\/services\/|\/solutions?\/|\/offering\//i,
        faq: /\/faq|\/frequently-asked|\/help\/|\/support\/|\/q-and-a/i,
        howTo: /\/how[-_]?to\/|\/guide\/|\/tutorial\/|\/learn\/|\/diy\//i,
        about: /\/about[-_]?us|\/about\/?$/i,
        contact: /\/contact[-_]?us|\/contact\/?$/i,
        localBusiness: /\/location\/|\/locations\/|\/store[-_]?locator|\/find[-_]?a[-_]?store/i,
        event: /\/event\/|\/events\/|\/webinar\/|\/conference\//i,
        recipe: /\/recipe\/|\/recipes\/|\/cook\//i,
        review: /\/review\/|\/reviews\/|\/rating\//i,
        person: /\/author\/|\/profile\/|\/team\/|\/staff\/|\/person\//i,
        job: /\/job\/|\/jobs\/|\/career\/|\/careers\/|\/employment\//i,
        video: /\/video\/|\/videos\/|\/watch\?v=|\/v\//i,
        news: /\/news\/|\/press[-_]?release|\/announcement\//i
    };
    
    // Content pattern detection
    const contentPatterns = {
        blogPost: /<article|<main[^>]*blog|class=["'][^"']*blog[^"']*["']|class=["'][^"']*post[^"']*["']|<time[^>]*datetime|author-bio|posted-by|published-on/i,
        product: /class=["'][^"']*product[^"']*["']|data-product-id|add-to-cart|price|availability|sku|<form[^>]*cart/i,
        service: /class=["'][^"']*service[^"']*["']|service-area|service-detail|free-consultation|get-a-quote/i,
        faq: /class=["'][^"']*faq[^"']*["']|frequently-asked|accordion|question.*answer/i,
        howTo: /class=["'][^"']*how[-_]?to[^"']*["']|step-by-step|instructions|materials-needed|tools-required/i,
        recipe: /class=["'][^"']*recipe[^"']*["']|ingredients|prep-time|cook-time|servings|nutrition/i,
        review: /class=["'][^"']*review[^"']*["']|star-rating|customer-review|rating|review-count/i,
        event: /class=["'][^"']*event[^"']*["']|event-date|event-time|event-location|register-now| RSVP/i,
        localBusiness: /class=["'][^"']*location[^"']*["']|store-hours|address|phone|get-directions|visit-us/i,
        video: /<video|<iframe[^>]*youtube|<iframe[^>]*vimeo|watch-video|video-player/i
    };
    
    // Article-specific patterns
    const articlePatterns = /<article|itemtype=["'].*?Article|class=["'][^"']*article[^"']*["']|post-date|entry-date|publish-date|author-name|byline/i;
    const blogPostingPatterns = /class=["'][^"']*blog[^"']*["']|class=["'][^"']*post[^"']*["']|<h1[^>]*entry-title|post-author|blog-post/i;
    
    // Check URL patterns
    let detectedTypes = [];
    
    if (urlPatterns.blogPost.test(urlLower)) detectedTypes.push({type: 'BlogPosting', source: 'url', confidence: 0.8});
    if (urlPatterns.product.test(urlLower)) detectedTypes.push({type: 'Product', source: 'url', confidence: 0.8});
    if (urlPatterns.service.test(urlLower)) detectedTypes.push({type: 'Service', source: 'url', confidence: 0.7});
    // FAQPage: URL signal alone is insufficient — must also pass content structure check (Self-Verification Protocol)
    if (urlPatterns.faq.test(urlLower) && validateSchemaCandidate('FAQPage', html, title, url, 0.8).valid) {
        detectedTypes.push({type: 'FAQPage', source: 'url', confidence: 0.8});
    }
    // HowTo: URL signal alone is insufficient — must also pass content structure check (Self-Verification Protocol)
    if (urlPatterns.howTo.test(urlLower) && validateSchemaCandidate('HowTo', html, title, url, 0.8).valid) {
        detectedTypes.push({type: 'HowTo', source: 'url', confidence: 0.8});
    }
    if (urlPatterns.recipe.test(urlLower)) detectedTypes.push({type: 'Recipe', source: 'url', confidence: 0.9});
    if (urlPatterns.event.test(urlLower)) detectedTypes.push({type: 'Event', source: 'url', confidence: 0.8});
    if (urlPatterns.video.test(urlLower)) detectedTypes.push({type: 'VideoObject', source: 'url', confidence: 0.7});
    if (urlPatterns.news.test(urlLower)) detectedTypes.push({type: 'NewsArticle', source: 'url', confidence: 0.8});
    
    // Check content patterns
    if (contentPatterns.blogPost.test(htmlLower) || articlePatterns.test(htmlLower)) {
        detectedTypes.push({type: 'Article', source: 'content', confidence: 0.7});
    }
    if (blogPostingPatterns.test(htmlLower)) {
        detectedTypes.push({type: 'BlogPosting', source: 'content', confidence: 0.8});
    }
    if (contentPatterns.product.test(htmlLower)) {
        detectedTypes.push({type: 'Product', source: 'content', confidence: 0.7});
    }
    if (contentPatterns.service.test(htmlLower)) {
        detectedTypes.push({type: 'Service', source: 'content', confidence: 0.6});
    }
    // FAQPage from content: also requires structural validation
    if (contentPatterns.faq.test(htmlLower) && validateSchemaCandidate('FAQPage', html, title, url, 0.75).valid) {
        detectedTypes.push({type: 'FAQPage', source: 'content', confidence: 0.75});
    }
    // HowTo from content: also requires structural validation
    if (contentPatterns.howTo.test(htmlLower) && validateSchemaCandidate('HowTo', html, title, url, 0.75).valid) {
        detectedTypes.push({type: 'HowTo', source: 'content', confidence: 0.75});
    }
    if (contentPatterns.recipe.test(htmlLower)) {
        detectedTypes.push({type: 'Recipe', source: 'content', confidence: 0.8});
    }
    if (contentPatterns.review.test(htmlLower)) {
        detectedTypes.push({type: 'Review', source: 'content', confidence: 0.6});
    }
    if (contentPatterns.event.test(htmlLower)) {
        detectedTypes.push({type: 'Event', source: 'content', confidence: 0.7});
    }
    if (contentPatterns.video.test(htmlLower)) {
        detectedTypes.push({type: 'VideoObject', source: 'content', confidence: 0.7});
    }
    
    // Check existing JSON-LD for hints
    if (jsonLdMatches.length > 0) {
        const jsonLdText = jsonLdMatches.join(' ').toLowerCase();
        if (jsonLdText.includes('"article"') || jsonLdText.includes('"blogposting"')) {
            detectedTypes.push({type: 'Article', source: 'jsonld', confidence: 0.9});
        }
        if (jsonLdText.includes('"product"')) {
            detectedTypes.push({type: 'Product', source: 'jsonld', confidence: 0.9});
        }
        if (jsonLdText.includes('"localbusiness"') || jsonLdText.includes('"organization"')) {
            detectedTypes.push({type: 'Organization', source: 'jsonld', confidence: 0.9});
        }
    }
    
    // Sort by confidence and pick the best
    detectedTypes.sort((a, b) => b.confidence - a.confidence);
    
    if (detectedTypes.length > 0) {
        // Prefer BlogPosting over Article for blog URLs
        const hasBlogPosting = detectedTypes.find(t => t.type === 'BlogPosting');
        const hasArticle = detectedTypes.find(t => t.type === 'Article');
        
        if (hasBlogPosting && hasArticle) {
            // If we have both, prefer BlogPosting for blog-like URLs
            if (urlPatterns.blogPost.test(urlLower)) {
                analysis.primaryType = 'BlogPosting';
            } else {
                analysis.primaryType = 'Article';
            }
        } else {
            analysis.primaryType = detectedTypes[0].type;
        }
        analysis.confidence = detectedTypes[0].confidence;
        analysis.secondaryTypes = detectedTypes.slice(1, 3).map(t => t.type);
    }
    
    // Detect breadcrumbs
    const breadcrumbPatterns = [
        /<nav[^>]*(?:breadcrumb|breadcrumb)[^>]*>([\s\S]*?)<\/nav>/gi,
        /<ol[^>]*(?:breadcrumb|breadcrumb)[^>]*>([\s\S]*?)<\/ol>/gi,
        /class=["'][^"']*breadcrumb[^"']*["']/gi
    ];
    
    for (const pattern of breadcrumbPatterns) {
        if (pattern.test(html)) {
            analysis.hasBreadcrumbs = true;
            // Try to extract breadcrumb items
            const bcMatch = html.match(/<nav[^>]*breadcrumb[^>]*>[\s\S]*?<\/nav>/i);
            if (bcMatch) {
                const items = bcMatch[0].match(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi);
                if (items) {
                    analysis.breadcrumbs = items.map((item, i) => {
                        const href = (item.match(/href=["']([^"']+)["']/i) || [])[1] || '';
                        const text = (item.match(/>([^<]+)<\/a>/i) || [])[1] || '';
                        return { url: href, name: text.trim() };
                    }).filter(b => b.name);
                }
            }
            break;
        }
    }
    
    // Extract article data if detected
    if (['Article', 'BlogPosting', 'NewsArticle'].includes(analysis.primaryType)) {
        analysis.articleData = extractArticleData(html, title, desc);
    }
    
    return analysis;
}

// Extract article-specific data from HTML
function extractArticleData(html, title, desc) {
    const data = {
        headline: title,
        description: desc,
        author: null,
        datePublished: null,
        dateModified: null,
        image: null,
        articleSection: null,
        wordCount: null
    };
    
    // Author detection
    const authorPatterns = [
        /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i,
        /class=["'][^"']*(?:author|byline)[^"']*["'][^>]*>([^<]+)/i,
        /rel=["']author["'][^>]*>([^<]+)<\/a>/i,
        /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
    ];
    
    for (const pattern of authorPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            data.author = match[1].trim();
            break;
        }
    }
    
    // Date detection
    const datePatterns = [
        { pattern: /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i, field: 'datePublished' },
        { pattern: /<meta[^>]*property=["']article:modified_time["'][^>]*content=["']([^"']+)["']/i, field: 'dateModified' },
        { pattern: /<time[^>]*datetime=["']([^"']+)["'][^>]*class=["'][^"']*published/i, field: 'datePublished' },
        { pattern: /<time[^>]*datetime=["']([^"']+)["'][^>]*class=["'][^"']*updated/i, field: 'dateModified' },
        { pattern: /<meta[^>]*name=["']publish-date["'][^>]*content=["']([^"']+)["']/i, field: 'datePublished' },
        { pattern: /class=["'][^"']*publish[^"']*["'][^>]*>([^<]+)<\/time>/i, field: 'datePublished' }
    ];
    
    for (const dp of datePatterns) {
        const match = html.match(dp.pattern);
        if (match && match[1]) {
            data[dp.field] = match[1].trim();
        }
    }
    
    // Image detection
    const imagePatterns = [
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
        /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
        /<article[^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["']/i
    ];
    
    for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            data.image = match[1].trim();
            break;
        }
    }
    
    // Article section/category
    const sectionMatch = html.match(/<meta[^>]*property=["']article:section["'][^>]*content=["']([^"']+)["']/i);
    if (sectionMatch) {
        data.articleSection = sectionMatch[1].trim();
    }
    
    // Word count (approximate)
    const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
    data.wordCount = bodyText.split(/\s+/).length;
    
    return data;
}

// Create the primary entity based on detected page type
function createPrimaryEntity(analysis, url, title, desc, ogImage, datePublished, dateModified, author, baseUrl) {
    const entity = {
        "@id": url,
        "url": url,
        "name": title,
        "description": desc,
        "isPartOf": {"@id": baseUrl + '/#website'},
        "image": ogImage
    };
    
    switch (analysis.primaryType) {
        case 'BlogPosting':
        case 'Article':
        case 'NewsArticle':
            entity["@type"] = analysis.primaryType;
            entity["@id"] = url + '#' + analysis.primaryType.toLowerCase(); // e.g. https://example.com/blog/post#blogposting
            entity.headline = title;
            // mainEntityOfPage: points to the WebPage (canonical URL) this article is the main entity of
            entity.mainEntityOfPage = {"@type": "WebPage", "@id": url};
            if (analysis.articleData) {
                if (analysis.articleData.author) {
                    entity.author = {
                        "@type": "Person",
                        "name": analysis.articleData.author
                    };
                }
                if (analysis.articleData.datePublished) {
                    entity.datePublished = analysis.articleData.datePublished;
                }
                if (analysis.articleData.dateModified) {
                    entity.dateModified = analysis.articleData.dateModified;
                }
                if (analysis.articleData.image) {
                    entity.image = analysis.articleData.image;
                }
                if (analysis.articleData.articleSection) {
                    entity.articleSection = analysis.articleData.articleSection;
                }
                if (analysis.articleData.wordCount) {
                    entity.wordCount = analysis.articleData.wordCount;
                }
            }
            // Add publisher reference
            entity.publisher = {"@id": baseUrl + '/#organization'};
            break;
            
        case 'Product':
            entity["@type"] = "Product";
            entity.name = title;
            // Product-specific properties would be extracted here
            break;
            
        case 'Service':
            entity["@type"] = "Service";
            entity.name = title;
            entity.provider = {"@id": baseUrl + '/#organization'};
            break;
            
        case 'FAQPage':
            entity["@type"] = "FAQPage";
            // FAQ items would be extracted here
            break;
            
        case 'HowTo':
            entity["@type"] = "HowTo";
            entity.name = title;
            // HowTo steps would be extracted here
            break;
            
        case 'Recipe':
            entity["@type"] = "Recipe";
            entity.name = title;
            // Recipe details would be extracted here
            break;
            
        case 'Event':
            entity["@type"] = "Event";
            entity.name = title;
            // Event details would be extracted here
            break;
            
        case 'VideoObject':
            entity["@type"] = "VideoObject";
            entity.name = title;
            // Video details would be extracted here
            break;
            
        default:
            entity["@type"] = "WebPage";
    }
    
    return entity;
}

// Create breadcrumb entity
function createBreadcrumbEntity(url, breadcrumbs, baseUrl) {
    const itemListElements = breadcrumbs.map((bc, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": bc.name,
        "item": bc.url
    }));
    
    // Add current page as last item if not already included
    if (breadcrumbs.length === 0 || breadcrumbs[breadcrumbs.length - 1].url !== url) {
        itemListElements.push({
            "@type": "ListItem",
            "position": itemListElements.length + 1,
            "name": document.title || 'Current Page',
            "item": url
        });
    }
    
    return {
        "@type": "BreadcrumbList",
        "@id": url + '#breadcrumb',
        "itemListElement": itemListElements
    };
}

// Auto-detect export helpers
function copyAutoDetectJSON(){const el=document.getElementById('autodetect-json');navigator.clipboard.writeText(el.textContent);showToast('Copied!','success');}
function copyEnhancedJSON(){const el=document.getElementById('enhanced-json');navigator.clipboard.writeText(el.textContent);showToast('Copied!','success');}
function copyChangesList(){
    if (!window._lastEnhancementChanges || !window._lastEnhancementChanges.length) {
        showToast('No changes to copy','error');
        return;
    }
    const text = window._lastEnhancementChanges.map(c => `• ${c.message}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast('Changes list copied!','success');
}
function downloadEnhancedJSON(){const el=document.getElementById('enhanced-json');dl(el.textContent,'application/ld+json','enhanced-schema.json');}
function copyGeneratedJSON(){const el=document.getElementById('generated-json');navigator.clipboard.writeText(el.textContent);showToast('Copied!','success');}
function dlGeneratedJSON(){const el=document.getElementById('generated-json');dl(el.textContent,'application/ld+json','generated-schema.json');}

function visualizeAutoDetect(){
    const el=document.getElementById('autodetect-json');
    if (!el) { showToast('No schema data found','error'); return; }
    try{
        const data=JSON.parse(el.textContent);
        openGraphModal();
        setTimeout(() => {
            // Hide tab UI, show graph container directly
            const scanEl = document.getElementById('graph-modal-scan');
            const pasteEl = document.getElementById('graph-modal-paste');
            const tabsEl = document.querySelector('.modal-tabs');
            if (scanEl) scanEl.style.display = 'none';
            if (pasteEl) pasteEl.style.display = 'none';
            if (tabsEl) tabsEl.style.display = 'none';
            const gc = document.getElementById('graph-container');
            if (gc) gc.style.display = 'flex';
            visualizeJSON(data,val('autodetect-url'),'Detected Schema');
        }, 100);
    }catch(e){showToast('Could not parse JSON: '+e.message,'error');}
}

// ═══════════════════════════════════════════
//  SCHEMA GRAPH VISUALIZATION
// ═══════════════════════════════════════════
const TYPE_COLORS = {
    'Organization':['#6B7280','Organization'],
    'LocalBusiness':['#6B7280','Organization'],
    'ProfessionalService':['#6B7280','ProfessionalService'],
    'MedicalBusiness':['#6B7280','Organization'],
    'Person':['#60A5FA','Person'],
    'WebSite':['#3B82F6','WebSite / WebPage'],
    'WebPage':['#3B82F6','WebSite / WebPage'],
    'Offer':['#F97316','Offer / Price'],
    'AggregateOffer':['#F97316','Offer / Price'],
    'FAQPage':['#EF4444','FAQ / HowTo'],
    'Question':['#EF4444','FAQ / HowTo'],
    'HowTo':['#EF4444','FAQ / HowTo'],
    'SearchAction':['#8B5CF6','Action'],
    'Action':['#8B5CF6','Action'],
    'Service':['#F59E0B','Thing / Entity'],
    'Product':['#F59E0B','Thing / Entity'],
    'ImageObject':['#A78BFA','Supporting'],
    'PostalAddress':['#EC4899','Place'],
    'GeoCoordinates':['#EC4899','Place'],
    'Place':['#EC4899','Place'],
    'City':['#EC4899','Place'],
    'State':['#EC4899','Place'],
    'Country':['#EC4899','Country'],
    'ContactPoint':['#34D399','Supporting'],
    'OpeningHoursSpecification':['#34D399','Supporting'],
    'AggregateRating':['#FBBF24','Rating'],
    'Rating':['#FBBF24','Rating'],
    'PropertyValue':['#9CA3AF','PropertyValue'],
    'OfferCatalog':['#F97316','Offer / Price'],
    'QuantitativeValue':['#9CA3AF','Supporting'],
    'Answer':['#EF4444','FAQ / HowTo'],
    'AdministrativeArea':['#EC4899','Place']
};

function getTypeColor(type) {
    if (!type) return ['#6B7280','Unknown'];
    const t = Array.isArray(type)?type[0]:type;
    return TYPE_COLORS[t] || ['#6B7280','Thing / Entity'];
}

function openGraphModal() { 
    const modal = document.getElementById('graph-modal');
    if (modal) {
        modal.classList.add('active');
        // Reset modal to centered position each time it opens
        const content = document.getElementById('graph-modal-content');
        if (content) {
            content.style.position = '';
            content.style.left = '';
            content.style.top = '';
            content.style.margin = '';
        }
        // Re-initialize resize handles
        setTimeout(() => { if (window.initModalResize) window.initModalResize(); }, 50);
    }
}
function closeGraphModal() { 
    const modal = document.getElementById('graph-modal');
    if (modal) modal.classList.remove('active');
    // Restore tab UI for next open
    const scanEl = document.getElementById('graph-modal-scan');
    const pasteEl = document.getElementById('graph-modal-paste');
    const tabsEl = document.querySelector('.modal-tabs');
    const gc = document.getElementById('graph-container');
    if (tabsEl) tabsEl.style.display = '';
    if (gc) gc.style.display = 'none';
    // Restore active tab
    const activeTab = document.querySelector('.modal-tab.active');
    const activeId = activeTab ? (activeTab.textContent.includes('Scan') ? 'graph-modal-scan' : 'graph-modal-paste') : 'graph-modal-scan';
    if (scanEl) scanEl.style.display = activeId === 'graph-modal-scan' ? '' : 'none';
    if (pasteEl) pasteEl.style.display = activeId === 'graph-modal-paste' ? '' : 'none';
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

function setGraphModalTab(btn, tab) {
    document.querySelectorAll('.modal-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('graph-modal-scan').classList.toggle('hidden', tab!=='scan');
    document.getElementById('graph-modal-paste').classList.toggle('hidden', tab!=='paste');
}

async function fetchAndVisualize() {
    const scanTab = !document.getElementById('graph-modal-scan').classList.contains('hidden');
    const statusEl = document.getElementById('graph-modal-status');

    if (scanTab) {
        const url = document.getElementById('graph-scan-url').value.trim();
        if (!url||!isURL(url)){showToast('Enter a valid URL','error');return;}
        statusEl.innerHTML = `<div class="status-msg">⏳ Fetching schema from "${escapeHtml(url)}"...</div>`;

        try {
            const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,{signal:AbortSignal.timeout(30000)});
            const html = await resp.text();
            const blocks = [];
            const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
            let m; while((m=regex.exec(html))!==null){try{blocks.push(JSON.parse(m[1].trim()));}catch(e){}}

            if(!blocks.length){statusEl.innerHTML=`<div class="status-msg" style="border-color:rgba(239,68,68,0.3);color:var(--red)">❌ No JSON-LD found on this page.</div>`;return;}

            let all=[]; blocks.forEach(b=>{if(b['@graph'])all.push(...b['@graph']);else all.push(b);});
            const titleM = html.match(/<title[^>]*>(.*?)<\/title>/i);
            const pageTitle = titleM?titleM[1].trim():url;

            statusEl.innerHTML = `<div class="status-msg">Found ${blocks.length} schema block(s) on "${escapeHtml(pageTitle)}". Rendering graph...</div>`;
            setTimeout(()=>{
                // Hide tab UI, show graph container (keep modal OPEN)
                const scanEl = document.getElementById('graph-modal-scan');
                const pasteEl = document.getElementById('graph-modal-paste');
                const tabsEl = document.querySelector('.modal-tabs');
                if (scanEl) scanEl.style.display = 'none';
                if (pasteEl) pasteEl.style.display = 'none';
                if (tabsEl) tabsEl.style.display = 'none';
                const gc = document.getElementById('graph-container');
                if (gc) gc.style.display = 'flex';
                visualizeJSON({"@context":"https://schema.org","@graph":all}, url, pageTitle);
            },600);
        } catch(e) {
            statusEl.innerHTML = `<div class="status-msg" style="border-color:rgba(239,68,68,0.3);color:var(--red)">❌ Could not fetch URL: ${escapeHtml(e.message)}</div>`;
        }
    } else {
        // Paste JSON-LD
        const raw = document.getElementById('graph-paste-json').value.trim();
        if(!raw){showToast('Paste some JSON-LD','error');return;}
        try {
            const data = JSON.parse(raw);
            // Hide tab UI, show graph container (keep modal OPEN)
            const scanEl = document.getElementById('graph-modal-scan');
            const pasteEl = document.getElementById('graph-modal-paste');
            const tabsEl = document.querySelector('.modal-tabs');
            if (scanEl) scanEl.style.display = 'none';
            if (pasteEl) pasteEl.style.display = 'none';
            if (tabsEl) tabsEl.style.display = 'none';
            const gc = document.getElementById('graph-container');
            if (gc) gc.style.display = 'flex';
            visualizeJSON(data, '', 'Pasted Schema');
        } catch(e){statusEl.innerHTML=`<div class="status-msg" style="border-color:rgba(239,68,68,0.3);color:var(--red)">❌ Invalid JSON: ${escapeHtml(e.message)}</div>`;}
    }
}

async function visualizeURL() {
    const urlEl = document.getElementById('graph-url');
    const url = urlEl ? urlEl.value.trim() : '';
    if (!url || !isURL(url)) { showToast('Please enter a valid URL.', 'error'); return; }
    
    const container = document.getElementById('graph-container');
    if (container) container.style.display = 'flex';
    
    try {
        showToast('Fetching schema...', 'info');
        const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {signal: AbortSignal.timeout(30000)});
        const html = await resp.text();
        
        // Extract JSON-LD blocks
        const jsonLdBlocks = [];
        const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = regex.exec(html)) !== null) {
            try { jsonLdBlocks.push(JSON.parse(match[1].trim())); } catch(e) {}
        }
        
        if (jsonLdBlocks.length === 0) {
            showToast('No JSON-LD found on this page.', 'warning');
            return;
        }
        
        // Combine all entities
        let allEntities = [];
        jsonLdBlocks.forEach(block => {
            if (block['@graph']) allEntities.push(...block['@graph']);
            else allEntities.push(block);
        });
        
        const combinedData = { "@context": "https://schema.org", "@graph": allEntities };
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const pageTitle = titleMatch ? titleMatch[1].trim() : url;
        
        // Hide tab UI, show graph container (keep modal OPEN)
        const scanEl2 = document.getElementById('graph-modal-scan');
        const pasteEl2 = document.getElementById('graph-modal-paste');
        const tabsEl2 = document.querySelector('.modal-tabs');
        if (scanEl2) scanEl2.style.display = 'none';
        if (pasteEl2) pasteEl2.style.display = 'none';
        if (tabsEl2) tabsEl2.style.display = 'none';
        const gcEl = document.getElementById('graph-container');
        if (gcEl) gcEl.style.display = 'flex';
        visualizeJSON(combinedData, url, pageTitle);
        showToast('Schema loaded!', 'success');
        
    } catch(err) {
        showToast('Failed to fetch URL: ' + err.message, 'error');
    }
}

function visualizeJSON(data, url, title) {
    // Graph is shown in modal, ensure container is visible
    const container = document.getElementById('graph-container');
    if (container) container.style.display = 'flex';
    
    const pageTitleEl = document.getElementById('graph-page-title');
    if (pageTitleEl) pageTitleEl.textContent = title ? '— '+title : '';

    // Build nodes and links
    const nodes = [], links = [], nodeMap = {};
    let entities = [];
    if (data['@graph']) entities = data['@graph'];
    else if (Array.isArray(data)) entities = data;
    else entities = [data];

    // Flatten nested entities
    function extract(obj, parentId) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(item => extract(item, parentId)); return; }

        const type = obj['@type'];
        if (!type) {
            // Check for @id references
            if (obj['@id'] && parentId) {
                const targetId = obj['@id'];
                if (!links.find(l => l.source===parentId && l.target===targetId))
                    links.push({source:parentId, target:targetId});
            }
            return;
        }

        const id = obj['@id'] || ('_auto_'+nodes.length);
        const name = obj.name || obj.text || (Array.isArray(type)?type[0]:type);
        const [color, category] = getTypeColor(type);

        if (!nodeMap[id]) {
            nodeMap[id] = { id, type: Array.isArray(type)?type[0]:type, name, color, category, data: obj };
            nodes.push(nodeMap[id]);
        }

        if (parentId && parentId !== id) {
            if (!links.find(l => l.source===parentId && l.target===id))
                links.push({source:parentId, target:id});
        }

        // Recurse into properties
        for (const [key, val] of Object.entries(obj)) {
            if (key.startsWith('@')) continue;
            if (val && typeof val === 'object') {
                if (Array.isArray(val)) {
                    val.forEach(item => { if (item && typeof item === 'object' && (item['@type'] || item['@id'])) extract(item, id); });
                } else if (val['@type'] || val['@id']) {
                    extract(val, id);
                }
            }
        }
    }

    entities.forEach(e => extract(e, null));

    // Fix link references
    const validIds = new Set(nodes.map(n=>n.id));
    const cleanLinks = links.filter(l => validIds.has(l.source) && validIds.has(l.target) && l.source !== l.target);

    graphData = { nodes, links: cleanLinks };
    renderGraph();
    renderGraphLegend();
}

function renderGraph() {
    const canvas = document.querySelector('.graph-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width || 800, H = rect.height || 600;

    // Use the existing SVG element
    const svg = document.getElementById('graph-svg');
    if (!svg) return;
    svg.innerHTML = '';
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);

    const { nodes, links } = graphData;
    if (!nodes.length) return;

    // Create link elements (rendered first so they're behind nodes)
    const linkGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
    svg.appendChild(linkGroup);

    links.forEach(l => {
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('stroke','rgba(100,120,160,0.4)');
        line.setAttribute('stroke-width','1.5');
        line._data = l;
        linkGroup.appendChild(line);
    });

    // Create node elements
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
    svg.appendChild(nodeGroup);

    // Build node lookup
    const nodeById = {};
    nodes.forEach(n => nodeById[n.id] = n);

    // Initialize node positions in a spiral/circle - well spread out
    const cx = W/2, cy = H/2;
    nodes.forEach((n,i) => {
        // Preserve existing position if available, otherwise initialize
        if (n.x === undefined) {
            const angle = (2*Math.PI*i)/nodes.length;
            // Use 45% of canvas size as base spread - much more space between nodes
            const spread = Math.min(W,H)*0.45;
            // Add extra random offset to break symmetry
            const r = spread*(0.6+Math.random()*0.8);
            n.x = cx + Math.cos(angle)*r;
            n.y = cy + Math.sin(angle)*r;
        }
        n.vx = n.vx || 0;
        n.vy = n.vy || 0;
        n.fx = n.fx || null; // Fixed position for dragged nodes
        n.fy = n.fy || null;
    });

    // Create visual elements for each node
    nodes.forEach((n) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg','g');
        g.style.cursor = 'grab';
        g.setAttribute('class', 'graph-node');
        
        const r = Math.min(10 + (links.filter(l=>l.source===n.id||l.target===n.id).length * 3), 28);
        n._r = r;

        // Circle (node)
        const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
        circle.setAttribute('r', r);
        circle.setAttribute('fill', n.color);
        circle.setAttribute('stroke','rgba(255,255,255,0.3)');
        circle.setAttribute('stroke-width','2');
        g.appendChild(circle);

        // Label background for readability
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg','rect');
        const labelText = (n.name||'').substring(0,20);
        const labelWidth = labelText.length * 7 + 14;
        labelBg.setAttribute('x', -labelWidth/2);
        labelBg.setAttribute('y', r + 5);
        labelBg.setAttribute('width', labelWidth);
        labelBg.setAttribute('height', 18);
        labelBg.setAttribute('rx', 5);
        labelBg.setAttribute('fill','rgba(255,255,255,0.92)');
        labelBg.setAttribute('stroke','rgba(0,0,0,0.08)');
        labelBg.setAttribute('stroke-width','1');
        labelBg.style.pointerEvents = 'none';
        g.appendChild(labelBg);

        // Label
        const text = document.createElementNS('http://www.w3.org/2000/svg','text');
        text.textContent = labelText;
        text.setAttribute('fill','#1a1f36');
        text.setAttribute('font-size','11');
        text.setAttribute('font-weight','600');
        text.setAttribute('text-anchor','middle');
        text.setAttribute('dy', r + 18);
        text.setAttribute('font-family','Inter, sans-serif');
        text.style.pointerEvents = 'none';
        g.appendChild(text);

        // Click to show details
        g.addEventListener('click', () => {
            showNodeDetails(n);
        });

        // Drag behavior - this is the key part!
        g.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            g.style.cursor = 'grabbing';
            
            // Get mouse position relative to SVG
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
            
            // Start dragging this node
            n.fx = n.x;
            n.fy = n.y;
            
            const dragStartX = svgP.x;
            const dragStartY = svgP.y;
            
            // Reheat the simulation when dragging starts
            simulationAlpha = 0.6;
            
            function onDrag(e) {
                const pt = svg.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
                
                // Move the node to the mouse position
                n.fx = svgP.x;
                n.fy = svgP.y;
                n.x = svgP.x;
                n.y = svgP.y;
                
                // Reset velocity
                n.vx = 0;
                n.vy = 0;
            }
            
            function onDragEnd() {
                g.style.cursor = 'grab';
                document.removeEventListener('mousemove', onDrag);
                document.removeEventListener('mouseup', onDragEnd);
                
                // Release the fixed position - let physics take over
                n.fx = null;
                n.fy = null;
                
                // Reheat simulation to let graph settle
                simulationAlpha = 0.3;
            }
            
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onDragEnd);
        });

        n._el = g;
        nodeGroup.appendChild(g);
    });

    // Force simulation state
    let simulationAlpha = 1.0;
    let isSimulationRunning = true;
    
    function simulate() {
        if (!isSimulationRunning) return;
        
        // Decay alpha over time
        simulationAlpha = simulationAlpha * 0.99;
        if (simulationAlpha < 0.001) {
            simulationAlpha = 0.001;
        }

        // Force parameters - increased spread
        const repulsion = 8000 * simulationAlpha;
        const linkStrength = 0.04;
        const linkDistance = 220;
        const centerForce = 0.02 * simulationAlpha;
        const damping = 0.82;

        // Apply repulsion between all pairs of nodes
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const ni = nodes[i];
                const nj = nodes[j];
                
                let dx = nj.x - ni.x;
                let dy = nj.y - ni.y;
                let dist = Math.sqrt(dx * dx + dy * dy) || 1;
                
                // Clamp minimum distance
                dist = Math.max(dist, 30);
                
                // Repulsion force (inverse square)
                const force = repulsion / (dist * dist);
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                // Apply to both nodes (Newton's third law)
                if (!ni.fx) { ni.vx -= fx; ni.vy -= fy; }
                if (!nj.fx) { nj.vx += fx; nj.vy += fy; }
            }
        }

        // Apply link forces (springs pulling connected nodes together)
        links.forEach(l => {
            const source = nodeById[l.source];
            const target = nodeById[l.target];
            if (!source || !target) return;
            
            let dx = target.x - source.x;
            let dy = target.y - source.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Spring force: pull towards ideal distance
            const displacement = dist - linkDistance;
            const force = displacement * linkStrength * simulationAlpha;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (!source.fx) { source.vx += fx; source.vy += fy; }
            if (!target.fx) { target.vx -= fx; target.vy -= fy; }
        });

        // Apply center gravity
        nodes.forEach(n => {
            if (!n.fx) {
                n.vx += (cx - n.x) * centerForce;
                n.vy += (cy - n.y) * centerForce;
            }
        });

        // Update positions
        nodes.forEach(n => {
            if (!n.fx) {
                n.vx *= damping;
                n.vy *= damping;
                n.x += n.vx;
                n.y += n.vy;
                
                // Keep within bounds
                n.x = Math.max(n._r + 10, Math.min(W - n._r - 10, n.x));
                n.y = Math.max(n._r + 10, Math.min(H - n._r - 10, n.y));
            }
        });

        // Update visual positions
        updatePositions();
        
        // Continue simulation
        requestAnimationFrame(simulate);
    }

    function updatePositions() {
        nodes.forEach(n => {
            if (n._el) {
                n._el.setAttribute('transform', `translate(${n.x},${n.y})`);
            }
        });
        
        linkGroup.querySelectorAll('line').forEach(line => {
            const l = line._data;
            const s = nodeById[l.source];
            const t = nodeById[l.target];
            if (s && t) {
                line.setAttribute('x1', s.x);
                line.setAttribute('y1', s.y);
                line.setAttribute('x2', t.x);
                line.setAttribute('y2', t.y);
            }
        });
    }

    // Start the simulation
    simulate();
    
    // Show first node details
    if (nodes.length) showNodeDetails(nodes[0]);
}

// Reset graph to re-run force simulation
function resetGraphPanZoom() {
    // Reset all node positions and velocities
    graphData.nodes.forEach(n => {
        n.x = undefined;
        n.y = undefined;
        n.vx = 0;
        n.vy = 0;
        n.fx = null;
        n.fy = null;
    });
    // Re-render the graph (will reinitialize positions and restart simulation)
    renderGraph();
    showToast('Graph reset', 'info');
}

// Graph container resize handler
function initGraphResize() {
    const container = document.getElementById('graph-container');
    const handle = document.getElementById('graph-resize-handle');
    if (!container || !handle) return;
    
    let startY, startHeight;
    
    handle.onmousedown = (e) => {
        e.preventDefault();
        startY = e.clientY;
        startHeight = container.offsetHeight;
        document.onmousemove = onDrag;
        document.onmouseup = stopDrag;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    };
    
    function onDrag(e) {
        const dy = e.clientY - startY;
        const newHeight = Math.max(300, Math.min(800, startHeight + dy));
        container.style.height = newHeight + 'px';
        // Re-render graph to fit new size
        if (graphData.nodes.length) {
            setTimeout(() => renderGraph(), 50);
        }
    }
    
    function stopDrag() {
        document.onmousemove = null;
        document.onmouseup = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }
}

function renderGraphLegend() {
    const cats = {};
    graphData.nodes.forEach(n => {
        const cat = n.category || 'Unknown';
        cats[cat] = cats[cat] || { color: n.color, count: 0 };
        cats[cat].count++;
    });
    const legend = document.getElementById('graph-legend');
    if (!legend) return;
    
    // Update graph info
    const infoEl = document.getElementById('graph-info');
    if (infoEl) infoEl.textContent = `${graphData.nodes.length} nodes, ${graphData.links.length} links`;
    
    legend.innerHTML = Object.entries(cats).map(([cat,{color,count}]) =>
        `<span class="legend-item"><span class="legend-color" style="background:${color}"></span>${cat} (${count})</span>`
    ).join('');
}

function showNodeDetails(node) {
    const detailsEl = document.getElementById('entity-details');
    if (!detailsEl) return;
    
    const data = node.data || {};
    let propsHtml = '';
    for (const [key, val] of Object.entries(data)) {
        if (key.startsWith('@')) continue;
        let display = val;
        if (typeof val === 'object') display = JSON.stringify(val).substring(0,120) + '...';
        if (typeof display === 'string' && display.length > 150) display = display.substring(0,150) + '...';
        propsHtml += `<div class="entity-property"><span class="key">${escapeHtml(key)}</span><span class="value">${escapeHtml(String(display))}</span></div>`;
    }
    
    detailsEl.innerHTML = `
        <span class="entity-type-badge" style="background: ${node.color}22; color: ${node.color};">${node.type}</span>
        <h4 style="margin: 12px 0 8px; font-size: 1rem; font-weight: 600;">${escapeHtml(node.name || node.type)}</h4>
        <div class="entity-properties">${propsHtml}</div>
    `;
    detailsEl.classList.add('active');
}

function setGraphLayout(layout) {
    graphLayout = layout;
    // Update button active states
    const buttons = document.querySelectorAll('.graph-toolbar .toolbar-btn');
    buttons.forEach((btn, i) => {
        btn.classList.toggle('active', (layout === 'force' && i === 0) || (layout === 'tree' && i === 1));
    });
    renderGraph();
}

// ═══════════════════════════════════════════
//  AUDIT A URL
// ═══════════════════════════════════════════
async function auditURL() {
    const url = val('audit-url');
    if (!url||!isURL(url)){showToast('Enter a valid URL.','error');return;}
    const out = document.getElementById('audit-output');
    if (!out) { showToast('Output element not found','error'); return; }
    out.style.display = 'block';
    out.innerHTML = `<div class="detect-status"><div class="spinner"></div><p>Auditing <strong>${escapeHtml(url)}</strong>...</p></div>`;

    try {
        const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,{signal:AbortSignal.timeout(30000)});
        const html = await resp.text();

        const blocks = [];
        const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let m; while((m=regex.exec(html))!==null){try{blocks.push(JSON.parse(m[1].trim()));}catch(e){}}

        const titleM = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const pageTitle = titleM?titleM[1].trim():url;

        // Run audit checks
        const audit = runAudit(blocks, html, url);
        renderAudit(audit, pageTitle, url, blocks);

        appStats.audits++;
        appStats.scores.push(audit.totalScore);
        appStats.lastUsed = 'Audit';
        saveStats();
        showToast('Audit complete!','success');
    } catch(e) {
        out.innerHTML = `<div class="detect-status"><p>❌ Could not fetch URL: ${escapeHtml(e.message)}</p></div>`;
    }
}

function runAudit(blocks, html, url) {
    const issues = [];
    let scores = { presence:0, structure:0, richness:0, bestPractices:0 };

    // 1. PRESENCE (25 pts)
    if (blocks.length > 0) { scores.presence += 15; issues.push({type:'pass',msg:'JSON-LD structured data detected.'}); }
    else { issues.push({type:'error',msg:'No JSON-LD structured data found on this page.'}); }

    let allEntities = [];
    blocks.forEach(b => { if(b['@graph']) allEntities.push(...b['@graph']); else allEntities.push(b); });

    if (allEntities.length >= 3) { scores.presence += 10; issues.push({type:'pass',msg:`${allEntities.length} entities found — good coverage.`}); }
    else if (allEntities.length > 0) { scores.presence += 5; issues.push({type:'warning',msg:`Only ${allEntities.length} entity/entities. Consider adding more for richer markup.`}); }

    // 2. STRUCTURE (25 pts)
    const hasGraph = blocks.some(b => b['@graph']);
    if (hasGraph) { scores.structure += 10; issues.push({type:'pass',msg:'Uses @graph architecture — excellent.'}); }
    else if (blocks.length) { scores.structure += 3; issues.push({type:'warning',msg:'No @graph wrapper found. Consider using @graph for better entity linking.'}); }

    const hasIds = allEntities.some(e => e['@id']);
    if (hasIds) { scores.structure += 8; issues.push({type:'pass',msg:'@id identifiers found for entity linking.'}); }
    else if (allEntities.length) { issues.push({type:'warning',msg:'No @id identifiers. Add @id to enable cross-referencing.'}); }

    const hasMainEntity = allEntities.some(e => e.mainEntityOfPage);
    if (hasMainEntity) { scores.structure += 7; issues.push({type:'pass',msg:'mainEntityOfPage property used.'}); }
    else if (allEntities.length) { issues.push({type:'warning',msg:'No mainEntityOfPage found. Helps search engines identify the primary entity.'}); }

    // 3. RICHNESS (25 pts)
    const types = allEntities.map(e => Array.isArray(e['@type'])?e['@type'][0]:e['@type']).filter(Boolean);
    const uniqueTypes = [...new Set(types)];

    if (uniqueTypes.length >= 5) { scores.richness += 8; } else if (uniqueTypes.length >= 3) { scores.richness += 5; } else if (uniqueTypes.length > 0) { scores.richness += 2; }
    issues.push({type: uniqueTypes.length>=3?'pass':'warning', msg:`${uniqueTypes.length} unique entity types: ${uniqueTypes.join(', ')}`});

    const hasSameAs = allEntities.some(e => e.sameAs);
    if (hasSameAs) { scores.richness += 6; issues.push({type:'pass',msg:'sameAs social/directory linking detected.'}); }
    else if (allEntities.length) { issues.push({type:'warning',msg:'No sameAs links. Add social profiles and directory URLs.'}); }

    const hasAddress = allEntities.some(e => e.address);
    if (hasAddress) { scores.richness += 5; issues.push({type:'pass',msg:'Address/location data present.'}); }

    const hasFAQ = allEntities.some(e => e['@type']==='FAQPage'||e['@type']==='Question');
    if (hasFAQ) { scores.richness += 3; issues.push({type:'pass',msg:'FAQ schema detected — eligible for rich results.'}); }

    const hasRating = allEntities.some(e => e.aggregateRating || e['@type']==='AggregateRating');
    if (hasRating) { scores.richness += 3; issues.push({type:'pass',msg:'AggregateRating detected.'}); }

    // 4. BEST PRACTICES (25 pts)
    const hasContext = blocks.some(b => b['@context']);
    if (hasContext) { scores.bestPractices += 5; } else if (blocks.length) { issues.push({type:'error',msg:'Missing @context declaration.'}); }

    const hasLogo = allEntities.some(e => e.logo);
    if (hasLogo) { scores.bestPractices += 5; issues.push({type:'pass',msg:'Logo defined in schema.'}); }
    else if (allEntities.length) { issues.push({type:'warning',msg:'No logo in schema. Add for brand recognition.'}); }

    // Check for common meta tags
    const hasMetaDesc = html.match(/<meta[^>]*name=["']description["']/i);
    if (hasMetaDesc) { scores.bestPractices += 3; } else { issues.push({type:'warning',msg:'No meta description tag found.'}); }

    const hasOG = html.match(/<meta[^>]*property=["']og:/i);
    if (hasOG) { scores.bestPractices += 3; issues.push({type:'pass',msg:'Open Graph tags present.'}); }
    else { issues.push({type:'warning',msg:'No Open Graph meta tags found.'}); }

    const hasWiki = allEntities.some(e => e.sameAs && (JSON.stringify(e.sameAs).includes('wikipedia')||JSON.stringify(e.sameAs).includes('wikidata')));
    if (hasWiki) { scores.bestPractices += 5; issues.push({type:'pass',msg:'Wikipedia/Wikidata knowledge graph links found!'}); }
    else if (allEntities.length) { issues.push({type:'warning',msg:'No Wikipedia/Wikidata links. Powerful for Knowledge Graph inclusion.'}); }

    const hasPhone = allEntities.some(e => e.telephone);
    if (hasPhone) { scores.bestPractices += 4; }

    const totalScore = Math.min(100, scores.presence + scores.structure + scores.richness + scores.bestPractices);

    return { totalScore, scores, issues, entityCount: allEntities.length, typeCount: uniqueTypes.length, types: uniqueTypes };
}

function renderAudit(audit, title, url, blocks) {
    const { totalScore, scores, issues } = audit;
    const scoreColor = totalScore >= 70 ? '#22c55e' : totalScore >= 40 ? '#00b8a9' : '#ef4444';
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (totalScore/100)*circumference;

    const out = document.getElementById('audit-output');
    out.innerHTML = `
        <div class="detect-result-card" style="text-align:center;margin-bottom:20px">
            <h3 style="margin-bottom:4px">Schema Audit: ${escapeHtml(title)}</h3>
            <p class="text-muted text-sm">${escapeHtml(url)}</p>
            <div class="audit-score-ring" style="margin-top:24px">
                <svg viewBox="0 0 120 120">
                    <circle class="ring-bg" cx="60" cy="60" r="50"/>
                    <circle class="ring-fg" cx="60" cy="60" r="50"
                        stroke="${scoreColor}"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"/>
                </svg>
                <div class="score-text" style="color:${scoreColor}">${totalScore}</div>
            </div>
            <p class="text-sm" style="margin-top:8px;color:#6b7280">${audit.entityCount} entities · ${audit.typeCount} types · ${blocks.length} JSON-LD blocks</p>
        </div>

        <div class="audit-categories">
            ${renderCatCard('Schema Presence', scores.presence, 25, '#3b82f6')}
            ${renderCatCard('Structure & @graph', scores.structure, 25, '#8b5cf6')}
            ${renderCatCard('Data Richness', scores.richness, 25, '#00b8a9')}
            ${renderCatCard('Best Practices', scores.bestPractices, 25, '#22c55e')}
        </div>

        <div class="audit-issues" style="margin-top:24px">
            <h3>📋 Detailed Findings</h3>
            ${issues.map(i => `
                <div class="audit-issue ${i.type}">
                    <span class="issue-icon">${i.type==='pass'?'✅':i.type==='error'?'❌':'⚠️'}</span>
                    <span class="issue-text">${i.msg}</span>
                </div>
            `).join('')}
        </div>

        <div style="text-align:center;margin-top:24px">
            <button class="btn btn-primary" onclick="visualizeAuditSchema('${escapeHtml(url)}')">🔗 View Schema Graph</button>
            <button class="btn btn-outline" style="margin-left:8px" onclick="document.getElementById('autodetect-url').value='${escapeHtml(url)}';showView('autodetect');autoDetect()">⚡ Auto-Enhance</button>
        </div>`;
}

// Visualize schema from audit results
async function visualizeAuditSchema(url) {
    if (!url) { showToast('No URL to visualize', 'error'); return; }
    
    // Close the audit output and switch to graph view
    const graphContainer = document.getElementById('graph-container');
    if (graphContainer) {
        graphContainer.style.display = 'flex';
        graphContainer.style.height = '500px';
    }
    
    // Scroll to top of graph
    graphContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    showToast('Fetching schema...', 'info');
    
    try {
        // Try multiple proxies
        const proxies = [
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`
        ];
        
        let html = null;
        for (const getUrl of proxies) {
            try {
                const resp = await fetch(getUrl(url), { signal: AbortSignal.timeout(15000) });
                if (resp.ok) {
                    html = await resp.text();
                    if (html && html.length > 100) break;
                }
            } catch(e) { continue; }
        }
        
        if (!html || html.length < 100) {
            showToast('Could not fetch the page', 'error');
            return;
        }
        
        const blocks = [];
        const regex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let m;
        while ((m = regex.exec(html)) !== null) {
            try { blocks.push(JSON.parse(m[1].trim())); } catch(e) {}
        }
        
        if (!blocks.length) {
            showToast('No JSON-LD found on this page', 'warning');
            return;
        }
        
        let allEntities = [];
        blocks.forEach(b => {
            if (b['@graph']) allEntities.push(...b['@graph']);
            else allEntities.push(b);
        });
        
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const pageTitle = titleMatch ? titleMatch[1].trim() : url;
        
        // Visualize the graph
        visualizeJSON({"@context":"https://schema.org","@graph":allEntities}, url, pageTitle);
        showToast('Schema loaded!', 'success');
    } catch(e) {
        showToast('Failed to fetch schema: ' + e.message, 'error');
    }
}

function renderCatCard(name, score, max, color) {
    const pct = Math.round(score/max*100);
    return `<div class="audit-cat-card">
        <h4>${name}</h4>
        <div class="cat-score" style="color:${color}">${score}<span class="text-muted text-sm">/${max}</span></div>
        <div class="cat-bar"><div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
}
// =========================================
// MODAL RESIZE - JS-driven from all edges
// =========================================
(function initModalResize() {
    function setup() {
        const modal = document.getElementById('graph-modal-content');
        const overlay = document.getElementById('graph-modal');
        if (!modal || !overlay) return;

        const handles = modal.querySelectorAll('.resize-edge');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', startResize);
        });
    }

    function startResize(e) {
        e.preventDefault();
        e.stopPropagation();

        const modal = document.getElementById('graph-modal-content');
        const dir = e.currentTarget.dataset.dir;

        const startX = e.clientX;
        const startY = e.clientY;
        const startW = modal.offsetWidth;
        const startH = modal.offsetHeight;
        const startLeft = modal.offsetLeft;
        const startTop = modal.offsetTop;

        // Switch positioning to absolute within overlay for free movement
        const overlay = document.getElementById('graph-modal');
        const overlayRect = overlay.getBoundingClientRect();

        // Get modal's current position
        const modalRect = modal.getBoundingClientRect();
        let curLeft = modalRect.left - overlayRect.left;
        let curTop  = modalRect.top  - overlayRect.top;

        // Change modal to absolute positioning so we can move it
        modal.style.position = 'absolute';
        modal.style.left = curLeft + 'px';
        modal.style.top  = curTop  + 'px';
        modal.style.margin = '0';

        document.body.style.cursor = e.currentTarget.style.cursor;
        document.body.style.userSelect = 'none';

        function onMove(e) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newW = startW;
            let newH = startH;
            let newLeft = curLeft;
            let newTop  = curTop;

            const minW = 500, minH = 380;

            if (dir.includes('e'))  newW = Math.max(minW, startW + dx);
            if (dir.includes('s'))  newH = Math.max(minH, startH + dy);
            if (dir.includes('w')) {
                newW = Math.max(minW, startW - dx);
                newLeft = curLeft + (startW - newW);
            }
            if (dir.includes('n')) {
                newH = Math.max(minH, startH - dy);
                newTop = curTop + (startH - newH);
            }

            modal.style.width  = newW + 'px';
            modal.style.height = newH + 'px';
            modal.style.left   = newLeft + 'px';
            modal.style.top    = newTop  + 'px';

            // Re-render graph if visible
            if (typeof renderGraph === 'function' && graphData && graphData.nodes && graphData.nodes.length) {
                requestAnimationFrame(renderGraph);
            }
        }

        function onUp() {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // Init after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }

    // Re-init when modal opens (it may be re-rendered)
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'graph-modal') return;
        setTimeout(setup, 100);
    });

    // Expose for manual call
    window.initModalResize = setup;
})();

// ═══════════════════════════════════════════════════════════════════════════
//  SERP RICH RESULTS PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

function serpPreviewMode(mode) {
    const pasteDiv = document.getElementById('serp-paste-input');
    const urlDiv = document.getElementById('serp-url-input');
    const pasteBtn = document.getElementById('serp-tab-paste');
    const urlBtn = document.getElementById('serp-tab-url');
    if (mode === 'paste') {
        pasteDiv.style.display = 'block';
        urlDiv.style.display = 'none';
        pasteBtn.style.opacity = '1';
        urlBtn.style.opacity = '0.6';
    } else {
        pasteDiv.style.display = 'none';
        urlDiv.style.display = 'block';
        pasteBtn.style.opacity = '0.6';
        urlBtn.style.opacity = '1';
    }
}

async function serpPreviewFromURL() {
    const url = document.getElementById('serp-url')?.value?.trim();
    if (!url) { showToast('Please enter a URL', 'error'); return; }
    const out = document.getElementById('serp-preview-output');
    out.innerHTML = `<div class="detect-status"><div class="spinner"></div><p>Scanning <strong>${escapeHtml(url)}</strong> for schema...</p></div>`;
    try {
        const proxies = [
            u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            u => `https://corsproxy.io/?${encodeURIComponent(u)}`
        ];
        let html = null;
        for (const p of proxies) {
            try { const r = await fetch(p(url), {signal: AbortSignal.timeout(15000)}); if (r.ok) { html = await r.text(); if (html && html.length > 100) break; } } catch(e) {}
        }
        if (!html) throw new Error('Could not fetch page');
        const blocks = [];
        const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let m;
        while ((m = re.exec(html)) !== null) { try { blocks.push(JSON.parse(m[1].trim())); } catch(e) {} }
        if (blocks.length === 0) { out.innerHTML = `<p style="color:#94a3b8;">No JSON-LD schema found on this page.</p>`; return; }
        const allEntities = blocks.flatMap(b => b['@graph'] ? b['@graph'] : [b]);
        document.getElementById('serp-schema-input').value = JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': allEntities
        }, null, 2);
        generateSerpPreview();
    } catch(e) {
        out.innerHTML = `<p style="color:#ef4444;">Error: ${escapeHtml(e.message)}</p>`;
    }
}

function generateSerpPreview() {
    const input = document.getElementById('serp-schema-input')?.value?.trim();
    const out = document.getElementById('serp-preview-output');
    if (!input) { showToast('Please paste a schema first', 'warning'); return; }
    let schema;
    try { schema = JSON.parse(input); } catch(e) { showToast('Invalid JSON — please check your schema', 'error'); return; }
    const entities = schema['@graph'] ? schema['@graph'] : [schema];

    let previewsHtml = '';

    // --- Article / BlogPosting preview ---
    const article = entities.find(e => ['Article','BlogPosting','NewsArticle'].includes(Array.isArray(e['@type'])?e['@type'][0]:e['@type']));
    if (article) {
        const headline = article.headline || article.name || 'Article Title';
        const desc = article.description || 'Article description will appear here in the search snippet.';
        const dateStr = article.datePublished ? new Date(article.datePublished).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'}) : '';
        const authorName = article.author ? (typeof article.author === 'object' ? (article.author.name || (Array.isArray(article.author) ? article.author[0]?.name : '')) : article.author) : '';
        const imgUrl = article.image ? (typeof article.image === 'string' ? article.image : article.image.url || '') : '';
        const siteUrl = article['@id'] ? (()=>{ try{const u=new URL(article['@id']);return u.hostname;}catch(e){return '';} })() : '';
        previewsHtml += `
        <div class="serp-preview-block">
            <div class="serp-preview-label">📰 Article / BlogPosting Rich Result</div>
            <div class="serp-card-article">
                ${imgUrl ? `<div class="serp-article-img-wrap"><img src="${escapeHtml(imgUrl)}" onerror="this.style.display='none'" style="width:80px;height:80px;object-fit:cover;border-radius:6px;float:right;margin-left:12px;"></div>` : ''}
                <div class="serp-article-meta">${siteUrl ? `<span class="serp-site">${escapeHtml(siteUrl)}</span>` : ''}${dateStr ? ` · <span class="serp-date">${escapeHtml(dateStr)}</span>` : ''}${authorName ? ` · <span class="serp-author">By ${escapeHtml(authorName)}</span>` : ''}</div>
                <div class="serp-article-title">${escapeHtml(headline)}</div>
                <div class="serp-article-desc">${escapeHtml(desc.substring(0,200))}${desc.length>200?'...':''}</div>
            </div>
            ${article.datePublished && article.dateModified ? '<div class="serp-check serp-ok">✅ Has datePublished & dateModified</div>' : '<div class="serp-check serp-warn">⚠️ Missing datePublished or dateModified — required for article rich results</div>'}
            ${article.image ? '<div class="serp-check serp-ok">✅ Has article image</div>' : '<div class="serp-check serp-warn">⚠️ Missing image — required for Google Discover</div>'}
            ${article.author ? '<div class="serp-check serp-ok">✅ Has author entity</div>' : '<div class="serp-check serp-warn">⚠️ Missing author — critical for E-E-A-T</div>'}
        </div>`;
    }

    // --- FAQ preview ---
    const faq = entities.find(e => (Array.isArray(e['@type'])?e['@type'][0]:e['@type']) === 'FAQPage');
    if (faq) {
        const qas = faq.mainEntity || [];
        previewsHtml += `
        <div class="serp-preview-block">
            <div class="serp-preview-label">❓ FAQPage Rich Result</div>
            <div class="serp-card-faq">
                <div class="serp-faq-title">Frequently Asked Questions</div>
                ${qas.slice(0,4).map(qa => `
                <div class="serp-faq-item">
                    <div class="serp-faq-q">▶ ${escapeHtml(qa.name || qa.question || 'Question')}</div>
                    <div class="serp-faq-a" style="display:none;padding:8px 12px;color:#5f6368;font-size:0.82rem;">${escapeHtml((qa.acceptedAnswer?.text || qa.answer || '').substring(0,200))}</div>
                </div>`).join('')}
                ${qas.length > 4 ? `<div class="serp-faq-more">+ ${qas.length - 4} more questions</div>` : ''}
            </div>
            <div class="serp-check serp-ok">✅ ${qas.length} Q&A pair${qas.length!==1?'s':''} detected — eligible for FAQ rich results</div>
        </div>`;
    }

    // --- HowTo preview ---
    const howto = entities.find(e => (Array.isArray(e['@type'])?e['@type'][0]:e['@type']) === 'HowTo');
    if (howto) {
        const steps3 = howto.step || [];
        previewsHtml += `
        <div class="serp-preview-block">
            <div class="serp-preview-label">🔧 HowTo Rich Result</div>
            <div class="serp-card-howto">
                <div class="serp-howto-title">${escapeHtml(howto.name || 'How To Guide')}</div>
                ${howto.totalTime ? `<div class="serp-howto-meta">⏱ ${escapeHtml(howto.totalTime)}</div>` : ''}
                <ol class="serp-howto-steps">
                    ${steps3.slice(0,4).map(s => `<li>${escapeHtml(typeof s === 'string' ? s : (s.text || s.name || ''))}</li>`).join('')}
                    ${steps3.length > 4 ? `<li style="color:#94a3b8;">+ ${steps3.length - 4} more steps</li>` : ''}
                </ol>
            </div>
            <div class="serp-check serp-ok">✅ ${steps3.length} steps — eligible for HowTo rich results</div>
        </div>`;
    }

    // --- Product preview ---
    const product = entities.find(e => (Array.isArray(e['@type'])?e['@type'][0]:e['@type']) === 'Product');
    if (product) {
        const offer = product.offers || {};
        const rating = product.aggregateRating;
        const stars = rating ? '★'.repeat(Math.round(parseFloat(rating.ratingValue||0))) + '☆'.repeat(5-Math.round(parseFloat(rating.ratingValue||0))) : '';
        previewsHtml += `
        <div class="serp-preview-block">
            <div class="serp-preview-label">🛍️ Product Rich Result</div>
            <div class="serp-card-product">
                <div class="serp-product-name">${escapeHtml(product.name || 'Product Name')}</div>
                ${rating ? `<div class="serp-product-rating"><span style="color:#f59e0b;">${stars}</span> <strong>${rating.ratingValue}</strong>/5 (${rating.reviewCount || rating.ratingCount || 0} reviews)</div>` : ''}
                ${offer.price ? `<div class="serp-product-price">${escapeHtml(offer.priceCurrency||'$')} ${escapeHtml(String(offer.price))}</div>` : ''}
                ${offer.availability ? `<div class="serp-product-availability ${offer.availability.includes('InStock')?'serp-ok':'serp-warn'}">${offer.availability.includes('InStock')?'✅ In Stock':'❌ Out of Stock'}</div>` : ''}
            </div>
            ${rating ? '<div class="serp-check serp-ok">✅ Has aggregateRating — eligible for star snippets</div>' : '<div class="serp-check serp-warn">⚠️ No aggregateRating — add reviews for star snippets</div>'}
            ${offer.price ? '<div class="serp-check serp-ok">✅ Has pricing information</div>' : '<div class="serp-check serp-warn">⚠️ No price — required for shopping rich results</div>'}
        </div>`;
    }

    // --- LocalBusiness / Organization preview ---
    const org = entities.find(e => {
        const t = Array.isArray(e['@type'])?e['@type'][0]:e['@type'];
        return ['LocalBusiness','Organization','ProfessionalService','MedicalBusiness','LegalService','Store','Restaurant'].includes(t);
    });
    if (org) {
        const rating2 = org.aggregateRating;
        const stars2 = rating2 ? '★'.repeat(Math.round(parseFloat(rating2.ratingValue||0))) + '☆'.repeat(5-Math.round(parseFloat(rating2.ratingValue||0))) : '';
        previewsHtml += `
        <div class="serp-preview-block">
            <div class="serp-preview-label">🏢 Business Knowledge Panel Preview</div>
            <div class="serp-card-business">
                <div class="serp-biz-name">${escapeHtml(org.name || 'Business Name')}</div>
                ${org.url ? `<div class="serp-biz-url">${escapeHtml(org.url)}</div>` : ''}
                ${org.description ? `<div class="serp-biz-desc">${escapeHtml(org.description.substring(0,160))}...</div>` : ''}
                ${org.telephone ? `<div class="serp-biz-contact">📞 ${escapeHtml(org.telephone)}</div>` : ''}
                ${org.address ? `<div class="serp-biz-contact">📍 ${escapeHtml(typeof org.address === 'string' ? org.address : [org.address.streetAddress, org.address.addressLocality, org.address.addressRegion].filter(Boolean).join(', '))}</div>` : ''}
                ${rating2 ? `<div class="serp-biz-rating"><span style="color:#f59e0b;">${stars2}</span> <strong>${rating2.ratingValue}</strong>/5 (${rating2.reviewCount || rating2.ratingCount || 0} reviews)</div>` : ''}
                ${(org.sameAs && org.sameAs.length > 0) ? `<div class="serp-biz-sameas">🔗 ${org.sameAs.length} entity links</div>` : ''}
            </div>
            ${rating2 ? '<div class="serp-check serp-ok">✅ Has aggregateRating — eligible for star snippets</div>' : '<div class="serp-check serp-warn">⚠️ No aggregateRating — add reviews for star snippets</div>'}
            ${(org.sameAs && org.sameAs.length >= 5) ? '<div class="serp-check serp-ok">✅ Has 5+ sameAs links — strong entity footprint</div>' : '<div class="serp-check serp-warn">⚠️ Fewer than 5 sameAs links — add more for entity strength</div>'}
        </div>`;
    }

    // --- BreadcrumbList preview ---
    const bc = entities.find(e => (Array.isArray(e['@type'])?e['@type'][0]:e['@type']) === 'BreadcrumbList');
    if (bc) {
        const items2 = bc.itemListElement || [];
        previewsHtml += `
        <div class="serp-preview-block">
            <div class="serp-preview-label">🍞 Breadcrumb Rich Result</div>
            <div class="serp-card-breadcrumb">
                <span class="serp-bc-path">${items2.map(i => escapeHtml(i.name || '')).join(' › ')}</span>
            </div>
            <div class="serp-check serp-ok">✅ ${items2.length} breadcrumb levels — eligible for breadcrumb rich results</div>
        </div>`;
    }

    if (!previewsHtml) {
        previewsHtml = `<div class="serp-preview-block"><p style="color:#94a3b8;font-size:0.9rem;">No previewable schema types found. Supported types: Article/BlogPosting, FAQPage, HowTo, Product, LocalBusiness, BreadcrumbList.</p></div>`;
    }

    out.innerHTML = `
        <h3 style="color:#e2e8f0;margin-bottom:16px;">📊 SERP Preview Results</h3>
        <p style="color:#64748b;font-size:0.82rem;margin-bottom:20px;">Note: These are simulated previews. Actual Google rendering may vary. Not all schema guarantees rich results.</p>
        ${previewsHtml}
        <div style="margin-top:16px;">
            <a href="https://developers.google.com/search/docs/appearance/structured-data" target="_blank" class="btn btn-outline btn-sm">🔍 Validate with Schema Markup Validator</a>
        </div>`;

    // Make FAQ items clickable
    out.querySelectorAll('.serp-faq-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            const ans = item.querySelector('.serp-faq-a');
            if (ans) ans.style.display = ans.style.display === 'none' ? 'block' : 'none';
        });
    });
}


// ═══════════════════════════════════════════════════════════════════════════
//  COMPETITOR SCHEMA COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

async function runCompetitorCompare() {
    const yourUrl = document.getElementById('comp-your-url')?.value?.trim();
    const compUrls = [1,2,3].map(n => document.getElementById(`comp-url-${n}`)?.value?.trim()).filter(Boolean);
    const out = document.getElementById('competitor-output');

    if (!yourUrl) { showToast('Please enter your URL', 'error'); return; }
    if (compUrls.length === 0) { showToast('Please enter at least one competitor URL', 'error'); return; }

    out.innerHTML = `<div class="detect-status"><div class="spinner"></div><p>Scanning ${1 + compUrls.length} URLs for schema data...</p></div>`;

    const allUrls = [yourUrl, ...compUrls];
    const results = [];

    for (const url of allUrls) {
        try {
            const proxies = [
                u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
                u => `https://corsproxy.io/?${encodeURIComponent(u)}`
            ];
            let html = null;
            for (const p of proxies) {
                try { const r = await fetch(p(url), {signal: AbortSignal.timeout(15000)}); if (r.ok) { html = await r.text(); if (html && html.length > 100) break; } } catch(e) {}
            }
            if (!html) { results.push({ url, error: 'Could not fetch', entities: [], props: {} }); continue; }
            const blocks = [];
            const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
            let m2;
            while ((m2 = re.exec(html)) !== null) { try { blocks.push(JSON.parse(m2[1].trim())); } catch(e) {} }
            const allEntities = blocks.flatMap(b => b['@graph'] ? b['@graph'] : [b]);
            const props = extractSchemaFingerprint(allEntities);
            const hostname = (() => { try { return new URL(url).hostname; } catch(e) { return url; } })();
            results.push({ url, hostname, entities: allEntities, props, error: null });
        } catch(e) {
            results.push({ url, error: e.message, entities: [], props: {} });
        }
    }

    renderCompetitorComparison(results, yourUrl, out);
}

function extractSchemaFingerprint(entities) {
    const fp = {
        types: [],
        properties: {},
        hasRating: false,
        hasSameAs: false,
        sameAsCount: 0,
        hasAuthor: false,
        hasFAQ: false,
        hasHowTo: false,
        hasBreadcrumb: false,
        hasProduct: false,
        hasImage: false,
        hasLogo: false,
        hasContactPoint: false,
        hasOpeningHours: false,
        hasPotentialAction: false,
        hasKnowsAbout: false,
        hasAreaServed: false,
        hasPriceRange: false,
        entityCount: entities.length
    };
    entities.forEach(e => {
        const t = Array.isArray(e['@type'])?e['@type'][0]:e['@type'];
        if (t && !fp.types.includes(t)) fp.types.push(t);
        if (e.aggregateRating) fp.hasRating = true;
        if (e.sameAs) { fp.hasSameAs = true; fp.sameAsCount += Array.isArray(e.sameAs) ? e.sameAs.length : 1; }
        if (e.author) fp.hasAuthor = true;
        if (t === 'FAQPage') fp.hasFAQ = true;
        if (t === 'HowTo') fp.hasHowTo = true;
        if (t === 'BreadcrumbList') fp.hasBreadcrumb = true;
        if (t === 'Product') fp.hasProduct = true;
        if (e.image) fp.hasImage = true;
        if (e.logo) fp.hasLogo = true;
        if (e.contactPoint) fp.hasContactPoint = true;
        if (e.openingHoursSpecification || e.openingHours) fp.hasOpeningHours = true;
        if (e.potentialAction) fp.hasPotentialAction = true;
        if (e.knowsAbout) fp.hasKnowsAbout = true;
        if (e.areaServed) fp.hasAreaServed = true;
        if (e.priceRange) fp.hasPriceRange = true;
        Object.keys(e).filter(k => !k.startsWith('@') && !k.startsWith('__')).forEach(k => { fp.properties[k] = (fp.properties[k]||0)+1; });
    });
    return fp;
}

function renderCompetitorComparison(results, yourUrl, out) {
    const yourResult = results[0];
    const competitors = results.slice(1);

    const featureRows = [
        { key: 'entityCount', label: '# of Schema Entities', getValue: fp => fp.entityCount, isGood: v => v >= 3 },
        { key: 'types', label: 'Schema Types', getValue: fp => fp.types.join(', ') || 'None', isGood: v => v !== 'None' },
        { key: 'hasFAQ', label: 'FAQPage Schema', getValue: fp => fp.hasFAQ ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasHowTo', label: 'HowTo Schema', getValue: fp => fp.hasHowTo ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasBreadcrumb', label: 'BreadcrumbList', getValue: fp => fp.hasBreadcrumb ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasRating', label: 'Aggregate Rating', getValue: fp => fp.hasRating ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasAuthor', label: 'Author Person Entity', getValue: fp => fp.hasAuthor ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasSameAs', label: 'sameAs Links', getValue: fp => fp.hasSameAs ? `✅ ${fp.sameAsCount} links` : '❌ None', isGood: v => v.includes('✅') },
        { key: 'hasImage', label: 'Image Object', getValue: fp => fp.hasImage ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasLogo', label: 'Logo Image', getValue: fp => fp.hasLogo ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasContactPoint', label: 'ContactPoint', getValue: fp => fp.hasContactPoint ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasOpeningHours', label: 'Opening Hours', getValue: fp => fp.hasOpeningHours ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasPotentialAction', label: 'potentialAction (CTAs)', getValue: fp => fp.hasPotentialAction ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasKnowsAbout', label: 'knowsAbout (Topics)', getValue: fp => fp.hasKnowsAbout ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasAreaServed', label: 'areaServed (Geo)', getValue: fp => fp.hasAreaServed ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') },
        { key: 'hasPriceRange', label: 'priceRange', getValue: fp => fp.hasPriceRange ? '✅ Yes' : '❌ No', isGood: v => v.includes('✅') }
    ];

    // Find gaps (things competitors have but you don't)
    const gaps = [];
    featureRows.forEach(row => {
        const yourVal = yourResult.props ? row.getValue(yourResult.props) : 'N/A';
        const yourGood = yourResult.props ? row.isGood(String(yourVal)) : false;
        if (!yourGood) {
            const compHas = competitors.some(c => c.props && row.isGood(String(row.getValue(c.props))));
            if (compHas) gaps.push(row.label);
        }
    });

    // Build table
    const headers = ['Feature', `Your Site<br><small style="color:#94a3b8;">${escapeHtml(yourResult.hostname||yourUrl)}</small>`, ...competitors.map(c => `Competitor<br><small style="color:#94a3b8;">${escapeHtml(c.hostname||c.url)}</small>`)];
    const tableRows = featureRows.map(row => {
        const yourVal = yourResult.props ? row.getValue(yourResult.props) : (yourResult.error ? '⚠️ Error' : 'N/A');
        const yourGood = yourResult.props ? row.isGood(String(yourVal)) : false;
        const yourCell = `<td class="${yourGood ? 'comp-cell-good' : 'comp-cell-gap'}">${yourVal}</td>`;
        const compCells = competitors.map(c => {
            const val = c.props ? row.getValue(c.props) : (c.error ? '⚠️ Error' : 'N/A');
            const good = c.props ? row.isGood(String(val)) : false;
            return `<td class="${good ? 'comp-cell-good' : 'comp-cell-bad'}">${val}</td>`;
        }).join('');
        return `<tr><td class="comp-feature-label">${row.label}</td>${yourCell}${compCells}</tr>`;
    });

    out.innerHTML = `
        <h3 style="color:#e2e8f0;margin-bottom:8px;">📊 Competitor Schema Comparison</h3>
        ${gaps.length > 0 ? `
        <div class="comp-gaps-box" style="background:#1e293b;border:1px solid #f59e0b44;border-radius:8px;padding:14px;margin-bottom:20px;">
            <div style="color:#f59e0b;font-weight:600;margin-bottom:8px;">⚠️ ${gaps.length} Schema Gap${gaps.length!==1?'s':''} Found — Competitors have these, you don't:</div>
            <ul style="margin:0;padding-left:20px;color:#e2e8f0;font-size:0.85rem;">
                ${gaps.map(g => `<li style="margin:4px 0;">${g}</li>`).join('')}
            </ul>
        </div>` : `<div class="comp-gaps-box" style="background:#1e293b;border:1px solid #10b98144;border-radius:8px;padding:14px;margin-bottom:20px;color:#10b981;font-weight:600;">✅ No major schema gaps found! Your schema is competitive.</div>`}
        <div style="overflow-x:auto;">
            <table class="comp-table">
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${tableRows.join('')}</tbody>
            </table>
        </div>`;
}

/* ═══════════════════════════════════════════════════════════
   Authentication, User Management & Session Handling
   ═══════════════════════════════════════════════════════════ */

// Global auth state
let currentUser = null;
let csrfToken = null;

/**
 * Initialize authentication — called on page load
 */
async function initAuth() {
    try {
        const res = await fetch('/api/me');
        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }
        const data = await res.json();
        currentUser = data.user;
        csrfToken = data.csrfToken;

        // Update sidebar user display
        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');

        if (avatarEl && currentUser) {
            avatarEl.textContent = currentUser.username.charAt(0).toUpperCase();
            nameEl.textContent = currentUser.username;
            roleEl.textContent = currentUser.role;
        }

        // Show admin controls if admin
        if (currentUser.role === 'admin') {
            const adminBtn = document.getElementById('adminUsersBtn');
            if (adminBtn) adminBtn.style.display = '';
        }
    } catch (err) {
        console.error('Auth init failed:', err);
    }
}

/**
 * Authenticated fetch helper — includes CSRF token
 */
async function authFetch(url, options = {}) {
    if (!options.headers) options.headers = {};
    if (csrfToken) {
        options.headers['X-CSRF-Token'] = csrfToken;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
        window.location.href = '/login';
        return null;
    }
    return res;
}

/**
 * Logout handler
 */
async function handleLogout() {
    try {
        await authFetch('/auth/logout', { method: 'POST' });
    } catch (e) { /* ignore */ }
    window.location.href = '/login';
}

/* ─── User Management Modal ───────────────────────────── */

async function openUserManagement() {
    document.getElementById('userMgmtModal').style.display = 'flex';
    document.getElementById('addUserMsg').style.display = 'none';
    document.getElementById('addUserMsg').className = 'form-message';
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newUserRole').value = 'user';
    await loadUserList();
}

function closeUserManagement() {
    document.getElementById('userMgmtModal').style.display = 'none';
}

async function loadUserList() {
    const listEl = document.getElementById('userList');
    listEl.innerHTML = '<div class="user-list-loading">Loading users...</div>';

    try {
        const res = await authFetch('/api/users');
        if (!res) return;
        const data = await res.json();

        if (!data.users || data.users.length === 0) {
            listEl.innerHTML = '<div class="user-list-loading">No users found.</div>';
            return;
        }

        const rows = data.users.map(u => {
            const isYou = u.id === currentUser.id;
            const lastLogin = u.last_login ? new Date(u.last_login).toLocaleString() : 'Never';
            const created = new Date(u.created_at).toLocaleDateString();

            return `<tr>
                <td>
                    <strong>${escapeHtml(u.username)}</strong>
                    ${isYou ? '<span class="user-you-badge">You</span>' : ''}
                </td>
                <td><span class="user-role-badge ${u.role}">${u.role}</span></td>
                <td>${created}</td>
                <td>${lastLogin}</td>
                <td>
                    <div class="user-actions">
                        <button class="btn-user-action reset" onclick="resetUserPassword(${u.id}, '${escapeHtml(u.username)}')" title="Reset password">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            Reset
                        </button>
                        ${!isYou ? `<button class="btn-user-action delete" onclick="deleteUser(${u.id}, '${escapeHtml(u.username)}')" title="Delete user">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                <path d="M10 11v6"></path>
                                <path d="M14 11v6"></path>
                            </svg>
                            Delete
                        </button>` : ''}
                    </div>
                </td>
            </tr>`;
        }).join('');

        listEl.innerHTML = `<table class="user-table">
            <thead><tr>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Actions</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    } catch (err) {
        listEl.innerHTML = '<div class="user-list-loading" style="color:#ef4444;">Failed to load users.</div>';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Add User Form
document.addEventListener('DOMContentLoaded', () => {
    const addForm = document.getElementById('addUserForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('addUserMsg');
            const username = document.getElementById('newUsername').value.trim();
            const password = document.getElementById('newPassword').value;
            const role = document.getElementById('newUserRole').value;

            if (!username || !password) {
                msgEl.textContent = 'Username and password are required.';
                msgEl.className = 'form-message error';
                return;
            }

            try {
                const res = await authFetch('/api/users', {
                    method: 'POST',
                    body: { username, password, role }
                });
                if (!res) return;
                const data = await res.json();

                if (res.ok && data.success) {
                    msgEl.textContent = data.message;
                    msgEl.className = 'form-message success';
                    document.getElementById('newUsername').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('newUserRole').value = 'user';
                    await loadUserList();
                    setTimeout(() => { msgEl.style.display = 'none'; msgEl.className = 'form-message'; }, 3000);
                } else {
                    msgEl.textContent = data.error || 'Failed to create user.';
                    msgEl.className = 'form-message error';
                }
            } catch (err) {
                msgEl.textContent = 'Server error. Please try again.';
                msgEl.className = 'form-message error';
            }
        });
    }
});

// Delete User
async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) return;

    try {
        const res = await authFetch(`/api/users/${userId}`, { method: 'DELETE' });
        if (!res) return;
        const data = await res.json();

        if (res.ok && data.success) {
            await loadUserList();
        } else {
            alert(data.error || 'Failed to delete user.');
        }
    } catch (err) {
        alert('Server error. Please try again.');
    }
}

// Reset User Password (admin)
async function resetUserPassword(userId, username) {
    const newPw = prompt(`Enter new password for "${username}" (min. 8 characters):`);
    if (!newPw) return;
    if (newPw.length < 8) {
        alert('Password must be at least 8 characters.');
        return;
    }

    try {
        const res = await authFetch(`/api/users/${userId}/password`, {
            method: 'PUT',
            body: { password: newPw }
        });
        if (!res) return;
        const data = await res.json();

        if (res.ok && data.success) {
            alert(`Password for "${username}" has been updated.`);
        } else {
            alert(data.error || 'Failed to reset password.');
        }
    } catch (err) {
        alert('Server error. Please try again.');
    }
}

/* ─── Change Own Password Modal ───────────────────────── */

function openChangePassword() {
    document.getElementById('changePwModal').style.display = 'flex';
    document.getElementById('changePwMsg').style.display = 'none';
    document.getElementById('changePwMsg').className = 'form-message';
    document.getElementById('currentPw').value = '';
    document.getElementById('newPw').value = '';
    document.getElementById('confirmNewPw').value = '';
}

function closeChangePassword() {
    document.getElementById('changePwModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const pwForm = document.getElementById('changePwForm');
    if (pwForm) {
        pwForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('changePwMsg');
            const currentPassword = document.getElementById('currentPw').value;
            const newPassword = document.getElementById('newPw').value;
            const confirmNew = document.getElementById('confirmNewPw').value;

            if (!currentPassword || !newPassword || !confirmNew) {
                msgEl.textContent = 'All fields are required.';
                msgEl.className = 'form-message error';
                return;
            }
            if (newPassword.length < 8) {
                msgEl.textContent = 'New password must be at least 8 characters.';
                msgEl.className = 'form-message error';
                return;
            }
            if (newPassword !== confirmNew) {
                msgEl.textContent = 'New passwords do not match.';
                msgEl.className = 'form-message error';
                return;
            }

            try {
                const res = await authFetch('/api/account/password', {
                    method: 'PUT',
                    body: { currentPassword, newPassword }
                });
                if (!res) return;
                const data = await res.json();

                if (res.ok && data.success) {
                    msgEl.textContent = 'Password changed successfully!';
                    msgEl.className = 'form-message success';
                    setTimeout(() => closeChangePassword(), 2000);
                } else {
                    msgEl.textContent = data.error || 'Failed to change password.';
                    msgEl.className = 'form-message error';
                }
            } catch (err) {
                msgEl.textContent = 'Server error. Please try again.';
                msgEl.className = 'form-message error';
            }
        });
    }
});

/* ─── Close modals on overlay click ───────────────────── */
document.addEventListener('click', (e) => {
    if (e.target.id === 'userMgmtModal') closeUserManagement();
    if (e.target.id === 'changePwModal') closeChangePassword();
});

/* ─── Initialize auth on page load ────────────────────── */
document.addEventListener('DOMContentLoaded', initAuth);

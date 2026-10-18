import { initPaymentWatch } from './payment-watch';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({iconUrl:markerIcon,iconRetinaUrl:markerIcon2x,shadowUrl:markerShadow});
let paymentWatch;
const csrf=()=>document.querySelector('meta[name=csrf-token]')?.content;
document.querySelectorAll('form[action$="/logout"]').forEach(form=>form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{const response=await fetch(form.action,{method:'POST',credentials:'same-origin',headers:{'X-CSRF-TOKEN':csrf(),'Accept':'application/json'}});if(!response.ok)throw new Error();window.location.assign('/');}catch{button.disabled=false;button.textContent='Gagal keluar. Coba lagi';}}));
const money=n=>'Rp '+new Intl.NumberFormat('id-ID').format(n);
const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
function baseMap(element,lat=-8.12849,lng=114.28391,zoom=12){const map=L.map(element,{scrollWheelZoom:false}).setView([lat,lng],zoom);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);return map;}
let treeMap;
window.TreeFund={miniMap(id){const e=document.getElementById(id);if(e&&!e._leaflet_id){const m=baseMap(e);L.circleMarker([-8.12849,114.28391],{radius:8,color:'#2d6a4f',fillOpacity:.7}).addTo(m);}}};
document.querySelectorAll('[data-sidebar]').forEach(button=>button.addEventListener('click',()=>document.getElementById('sidebar')?.classList.toggle('open')));
document.addEventListener('click',e=>{const side=document.getElementById('sidebar');if(window.innerWidth<=700 && side?.classList.contains('open') && !side.contains(e.target) && !e.target.closest('[data-sidebar]'))side.classList.remove('open');});
document.querySelectorAll('[data-confirm]').forEach(form=>form.addEventListener('submit',e=>{if(!confirm(form.dataset.confirm))e.preventDefault();}));
document.querySelectorAll('[data-checkout]').forEach(form=>{const q=form.querySelector('[data-quantity]');const update=()=>document.querySelector('[data-total]').textContent=money(Number(q.value)*Number(form.dataset.price));q.addEventListener('input',update);update();});
document.querySelectorAll('input[type=file][accept*="image"]').forEach(input=>input.addEventListener('change',()=>{input.parentElement.querySelector('.photo-preview')?.remove();const file=input.files?.[0];if(!file||!file.type.startsWith('image/'))return;const image=document.createElement('img');image.className='photo-preview';image.alt='Pratinjau foto yang dipilih';const url=URL.createObjectURL(file);image.onload=()=>URL.revokeObjectURL(url);image.src=url;input.parentElement.append(image);}));
document.querySelectorAll('[data-gps]').forEach(button=>button.addEventListener('click',()=>{const form=button.closest('form')??document.querySelector('form[action="/partner/plots"]');const status=button.closest('form')?.querySelector('[data-gps-status]')??document.querySelector('[data-gps-status]');if(!navigator.geolocation){if(status)status.textContent='GPS tidak tersedia. Masukkan koordinat secara manual.';return;}button.disabled=true;if(status)status.textContent='Membaca lokasi perangkat…';navigator.geolocation.getCurrentPosition(p=>{form.querySelector('[name=latitude]').value=p.coords.latitude.toFixed(7);form.querySelector('[name=longitude]').value=p.coords.longitude.toFixed(7);if(status)status.textContent='Koordinat terbaca. Akurasi perangkat sekitar '+Math.round(p.coords.accuracy)+' meter; tetap diperiksa Admin.';button.disabled=false;},()=>{button.disabled=false;if(status)status.textContent='Lokasi belum dapat diakses. Periksa izin browser atau masukkan koordinat secara manual.';},{enableHighAccuracy:true,timeout:15000});}));
document.querySelectorAll('[data-pay]').forEach(button=>button.addEventListener('click',async()=>{const message=document.querySelector('[data-payment-message]');button.disabled=true;message.textContent='Menyiapkan pembayaran Sandbox…';try{const response=await fetch(button.dataset.pay,{method:'POST',headers:{'X-CSRF-TOKEN':csrf(),'Accept':'application/json'}});const data=await response.json();if(!response.ok)throw new Error(Object.values(data.errors??{}).flat()[0]??data.message??'Pembayaran belum dapat dibuka.');paymentWatch?.start();if(!window.snap)throw new Error('Snap Midtrans belum dimuat. Periksa koneksi internet dan client key.');window.snap.pay(data.token,{onSuccess:()=>{message.textContent='Pembayaran diterima. Mengonfirmasi status ke server…';paymentWatch?.check();button.disabled=false;},onPending:()=>{message.textContent='Menunggu pembayaran. Status diperiksa otomatis.';paymentWatch?.start();button.disabled=false;},onError:()=>{message.textContent='Pembayaran belum berhasil. Periksa status pesanan sebelum mencoba kembali.';button.disabled=false;},onClose:()=>{message.textContent='Popup ditutup. Penutupan popup tidak membatalkan pembayaran.';button.disabled=false;}});}catch(error){message.textContent=error.message;button.disabled=false;}}));
async function initMaps(){document.querySelectorAll('[data-coordinate-map]').forEach(e=>{if(e.closest('dialog')&&!e.closest('dialog').open)return;const lat=Number(e.dataset.lat),lng=Number(e.dataset.lng);const map=baseMap(e,lat,lng);e._treefundMap=map;L.marker([lat,lng]).addTo(map);});if(document.getElementById('plot-preview-map'))window.TreeFund.miniMap('plot-preview-map');if(document.getElementById('overview-map'))window.TreeFund.miniMap('overview-map');const e=document.getElementById('tree-map');if(!e)return;treeMap=baseMap(e,-7.5,112,7);try{const response=await fetch(e.dataset.mapUrl,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error();const rows=await response.json();const markers=[];for(const row of rows){const content=document.createElement('div');content.append(text('strong',row.species),text('p',row.code),text('p',row.plot),text('small','Diperbarui '+row.updated_at));const link=text('a','Lihat timeline →');link.href='/trees?tree='+encodeURIComponent(row.id);link.style.color='#2d6a4f';content.append(link);const marker=L.marker([row.latitude,row.longitude]).addTo(treeMap).bindPopup(content);markers.push(marker);if(Number(new URLSearchParams(location.search).get('tree'))===row.id){marker.openPopup();treeMap.setView([row.latitude,row.longitude],15);}}const fit=()=>{if(markers.length)treeMap.fitBounds(L.featureGroup(markers).getBounds().pad(.2),{maxZoom:15});};if(!location.search.includes('tree='))fit();document.querySelector('[data-map-fit]')?.addEventListener('click',fit);}catch{const notice=document.createElement('div');notice.className='info-box';notice.style.cssText='position:absolute;top:65px;left:15px;z-index:600;max-width:300px';notice.textContent='Peta belum dapat memuat titik. Foto dan timeline tetap dapat dibaca.';e.append(notice);}}
initMaps();

const evidenceImages = document.querySelectorAll('[data-evidence-src]');
if (evidenceImages.length) {
    const loadEvidence = image => {
        image.src = image.dataset.evidenceSrc;
        image.removeAttribute('data-evidence-src');
    };
    if ('IntersectionObserver' in window) {
        const evidenceObserver = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    loadEvidence(entry.target);
                    evidenceObserver.unobserve(entry.target);
                }
            }
        }, { rootMargin: '100px 0px' });
        evidenceImages.forEach(image => evidenceObserver.observe(image));
        window.addEventListener('pagehide', () => evidenceObserver.disconnect());
        window.addEventListener('pageshow', event => { if (event.persisted) document.querySelectorAll('[data-evidence-src]').forEach(image => evidenceObserver.observe(image)); });
    } else {
        evidenceImages.forEach(loadEvidence);
    }
}
document.querySelector('[data-public-menu]')?.addEventListener('click', event => {
    const button = event.currentTarget;
    const open = document.getElementById('website-nav')?.classList.toggle('open');
    button.setAttribute('aria-expanded', String(!!open));
});
async function initPublicMap() {
    const element = document.getElementById('public-map');
    if (!element) return;
    const status = document.querySelector('[data-public-map-status]');
    const map = baseMap(element, -5, 117, 5);
    try {
        const response = await fetch(element.dataset.mapUrl, {headers: {Accept: 'application/json'}});
        if (!response.ok) throw new Error();
        const rows = await response.json();
        const markers = rows.map(row => {
            const popup = document.createElement('div');
            popup.append(text('strong', row.name), text('p', row.location), text('p', row.group), text('small', row.species.join(', ') + ' · Tersedia ' + row.available + ' pohon'));
            const link = text('a', 'Lihat penawaran →');
            link.href = '/catalog?q=' + encodeURIComponent(row.name);
            popup.append(link);
            return L.marker([row.latitude, row.longitude]).addTo(map).bindPopup(popup);
        });
        if (markers.length) map.fitBounds(L.featureGroup(markers).getBounds().pad(.25), {maxZoom: 12});
        status.textContent = rows.length ? rows.length + ' lahan terverifikasi tersedia pada katalog.' : 'Belum ada lahan yang dipublikasikan.';
    } catch {
        status.textContent = 'Data peta belum dapat dimuat. Penawaran tetap tersedia pada katalog.';
    }
}
initPublicMap();
paymentWatch = initPaymentWatch({csrf});
document.querySelectorAll('[data-review-target]').forEach(button => button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.reviewTarget);
    if (!dialog) return;
    dialog.showModal();
        requestAnimationFrame(() => dialog.querySelectorAll('[data-coordinate-map]').forEach(element => {
        if (!element._treefundMap) {
            const latitude = Number(element.dataset.lat);
            const longitude = Number(element.dataset.lng);
            element._treefundMap = baseMap(element, latitude, longitude);
            L.marker([latitude, longitude]).addTo(element._treefundMap);
        }
        element._treefundMap.invalidateSize();
    }));
}));
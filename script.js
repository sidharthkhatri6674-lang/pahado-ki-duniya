const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let properties = [];
let currentProperty = null;
let currentSession = null;

function money(n){return "₹"+Number(n||0).toLocaleString("en-IN")}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return String(s??"").replace(/'/g,"%27").replace(/"/g,"%22")}

async function loadProperties(){
  const {data,error}=await db.from("properties").select("*").eq("published",true).order("created_at",{ascending:false});
  if(error){console.error(error);toast("Could not load stays. Check Supabase setup.");return}
  properties=data||[];
  render(properties);
}

function render(list=properties){
 const grid=document.getElementById("propertyGrid"), empty=document.getElementById("emptyState");
 grid.innerHTML="";
 empty.classList.toggle("hidden",list.length>0);
 list.forEach(p=>{
   const card=document.createElement("article"); card.className="property-card";
   card.innerHTML=`<div class="property-img" style="background-image:url('${escapeAttr(p.image_url)}')"><button class="heart" aria-label="Save">♡</button></div>
   <div class="property-body"><span class="pill">${escapeHTML(p.type)}</span><h3>${escapeHTML(p.name)}</h3><p class="location">📍 ${escapeHTML(p.city)}</p>
   <div class="property-bottom"><div class="rating">★ ${p.rating ?? "—"}</div><div class="price"><b>${money(p.price)}</b> <small>/ night</small></div></div>
   <button class="card-btn" onclick="openProperty('${p.id}')">View stay</button></div>`;
   grid.appendChild(card);
 });
 renderAdmin();
}

function filterCity(city){
 document.getElementById("searchCity").value=city;
 const list=city?properties.filter(p=>p.city===city):properties;
 render(list);
 document.getElementById("stays").scrollIntoView({behavior:"smooth"});
}
function searchStays(){filterCity(document.getElementById("searchCity").value)}

function openProperty(id){
 currentProperty=properties.find(p=>p.id===id); if(!currentProperty)return;
 document.getElementById("modalImage").src=currentProperty.image_url||"";
 document.getElementById("modalType").textContent=currentProperty.type||"Stay";
 document.getElementById("modalName").textContent=currentProperty.name;
 document.getElementById("modalLocation").textContent="📍 "+currentProperty.city+"  •  ★ "+(currentProperty.rating??"—");
 document.getElementById("modalDescription").textContent=currentProperty.description||"";
 document.getElementById("modalPrice").textContent=money(currentProperty.price);
 document.getElementById("propertyModal").classList.remove("hidden");
}
function closeModal(){document.getElementById("propertyModal").classList.add("hidden")}

async function submitBooking(){
 if(!currentProperty)return;
 const name=document.getElementById("bookName").value.trim(), phone=document.getElementById("bookPhone").value.trim();
 const cin=document.getElementById("bookIn").value, cout=document.getElementById("bookOut").value, guests=Number(document.getElementById("bookGuests").value||1);
 if(!name||!phone||!cin||!cout){toast("Please fill your name, phone and dates.");return}
 if(cout<=cin){toast("Check-out must be after check-in.");return}
 const {error}=await db.from("bookings").insert({property_id:currentProperty.id,guest_name:name,guest_phone:phone,check_in:cin,check_out:cout,guests,status:"pending"});
 if(error){console.error(error);toast("Booking request could not be sent. Please try again.");return}
 const message=`Hello Pahado Ki Duniya, I want to book ${currentProperty.name} in ${currentProperty.city}. Name: ${name}. Phone: ${phone}. Check-in: ${cin}. Check-out: ${cout}. Guests: ${guests}.`;
 const target=(currentProperty.phone||"919876543210").replace(/\D/g,"");
 window.open(`https://wa.me/${target}?text=${encodeURIComponent(message)}`,"_blank");
 toast("Booking request saved successfully!");
}

async function loginAdmin(e){
 e.preventDefault();
 const email=document.getElementById("adminEmail").value.trim(), password=document.getElementById("adminPassword").value;
 setMessage("loginMessage","Signing in…");
 const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error){setMessage("loginMessage",error.message,true);return}
 currentSession=data.session;
 await showAdmin(data.session);
}

async function showAdmin(session){
 currentSession=session;
 if(!session){
   document.getElementById("adminLogin").classList.remove("hidden");
   document.getElementById("adminDashboard").classList.add("hidden");
   return;
 }
 const {data,error}=await db.from("admins").select("user_id").eq("user_id",session.user.id).maybeSingle();
 if(error||!data){
   await db.auth.signOut();
   setMessage("loginMessage","This account is not registered as a Pahado Ki Duniya admin.",true);
   return;
 }
 document.getElementById("adminLogin").classList.add("hidden");
 document.getElementById("adminDashboard").classList.remove("hidden");
 document.getElementById("adminUserEmail").textContent=session.user.email;
 await loadAdminProperties();
}

async function adminLogout(){await db.auth.signOut();currentSession=null;document.getElementById("adminLogin").classList.remove("hidden");document.getElementById("adminDashboard").classList.add("hidden");}

async function loadAdminProperties(){
 const {data,error}=await db.from("properties").select("*").order("created_at",{ascending:false});
 if(error){setMessage("adminMessage",error.message,true);return}
 renderAdmin(data||[]);
}

async function addProperty(e){
 e.preventDefault();
 const payload={name:document.getElementById("pName").value.trim(),city:document.getElementById("pCity").value,type:document.getElementById("pType").value,price:Number(document.getElementById("pPrice").value),rating:Number(document.getElementById("pRating").value),image_url:document.getElementById("pImage").value.trim(),description:document.getElementById("pDescription").value.trim(),phone:document.getElementById("pPhone").value.trim(),published:true};
 if(!payload.image_url)payload.image_url="https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=80";
 const {error}=await db.from("properties").insert(payload);
 if(error){setMessage("adminMessage",error.message,true);return}
 e.target.reset();document.getElementById("pRating").value="4.5";
 setMessage("adminMessage","Stay published successfully!");
 await loadProperties(); await loadAdminProperties();
 document.getElementById("stays").scrollIntoView({behavior:"smooth"});
}

function renderAdmin(list=[]){
 const box=document.getElementById("adminProperties"), count=document.getElementById("count"); if(!box)return;
 count.textContent=`(${list.length})`;box.innerHTML="";
 list.forEach(p=>{const el=document.createElement("div");el.className="admin-item";el.innerHTML=`<img src="${escapeAttr(p.image_url)}" alt=""><div><b>${escapeHTML(p.name)}</b><small>📍 ${escapeHTML(p.city)} · ${money(p.price)} · ${p.published?"Published":"Hidden"}</small></div><button class="delete" onclick="deleteProperty('${p.id}')">Delete</button>`;box.appendChild(el)})
}

async function deleteProperty(id){
 if(!confirm("Delete this stay?"))return;
 const {error}=await db.from("properties").delete().eq("id",id);
 if(error){setMessage("adminMessage",error.message,true);return}
 await loadProperties();await loadAdminProperties();toast("Stay deleted.");
}

function setMessage(id,msg,error=false){const el=document.getElementById(id);if(!el)return;el.textContent=msg;el.className="admin-message"+(error?" error":"")}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function toggleMenu(){document.querySelector(".navbar nav").classList.toggle("mobile-open")}

document.getElementById("propertyModal").addEventListener("click",e=>{if(e.target.id==="propertyModal")closeModal()});
document.getElementById("loginForm").addEventListener("submit",loginAdmin);
document.getElementById("propertyForm").addEventListener("submit",addProperty);

db.auth.getSession().then(({data})=>showAdmin(data.session));
db.auth.onAuthStateChange((_event,session)=>showAdmin(session));
loadProperties();

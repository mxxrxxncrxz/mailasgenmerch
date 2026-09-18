
const SUPABASE_URL = "https://cgtjmwnbfqtbvwqbbupk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UPhXxvzFa8WsI08Dv4JaJw_v-AoUe13";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const state = {page:"dashboard", user:null, products:[], transactions:[], cart:[], loading:false};
const $ = s => document.querySelector(s);
const money = n => "₱"+Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
const esc = s => String(s??"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function toast(t){ const e=$("#toast"); if(!e)return; e.textContent=t; e.classList.add("show"); setTimeout(()=>e.classList.remove("show"),2200); }
function status(p){ if(Number(p.quantity)<=0)return ['out','Out of Stock']; if(Number(p.quantity)<=Number(p.reorderLevel))return ['low','Low Stock']; return ['ok','Stock Available']; }
function totals(){ return {items:state.products.reduce((a,p)=>a+Number(p.quantity||0),0),value:state.products.reduce((a,p)=>a+Number(p.quantity||0)*Number(p.price||0),0),sales:state.transactions.reduce((a,t)=>a+Number(t.total||0),0)}; }

function normalizeProduct(p){
 return {id:p.id,name:p.name,srp:Number(p.srp||0),price:Number(p.price||0),quantity:Number(p.quantity||0),reorderLevel:Number(p.reorder_level ?? p.reorderLevel ?? 5),category:p.category||"Uncategorized"};
}
function normalizeTx(t, itemsByTx){
 return {id:t.id,date:t.transaction_date||t.date,total:Number(t.total||0),cash:Number(t.cash||0),change:Number(t.change||0),items:(itemsByTx||[]).map(x=>({id:x.product_id,name:x.product_name,price:Number(x.price||0),qty:Number(x.quantity||0)}))};
}

async function loadData(){
 state.loading=true; render();
 const [{data:products,error:pe},{data:tx,error:te}] = await Promise.all([
   db.from("products").select("*").order("name"),
   db.from("transactions").select("*").order("transaction_date",{ascending:false}).limit(200)
 ]);
 if(pe || te){ console.error(pe||te); toast("Could not load database. Check Supabase setup."); state.loading=false; render(); return; }
 const ids=(tx||[]).map(x=>x.id);
 let items=[];
 if(ids.length){ const r=await db.from("transaction_items").select("*").in("transaction_id",ids); if(!r.error) items=r.data||[]; }
 const by={}; items.forEach(x=>(by[x.transaction_id]??=[]).push(x));
 state.products=(products||[]).map(normalizeProduct);
 state.transactions=(tx||[]).map(x=>normalizeTx(x,by[x.id]));
 state.loading=false; render();
}

let realtimeChannel=null;
function startRealtime(){
 if(realtimeChannel) db.removeChannel(realtimeChannel);
 realtimeChannel=db.channel("mailas-live")
  .on("postgres_changes",{event:"*",schema:"public",table:"products"},()=>loadData())
  .on("postgres_changes",{event:"*",schema:"public",table:"transactions"},()=>loadData())
  .subscribe();
}
function stopRealtime(){ if(realtimeChannel){db.removeChannel(realtimeChannel);realtimeChannel=null;} }

async function login(){
 const email=$("#username").value.trim(), password=$("#password").value;
 if(!email || !password)return toast("Enter your email and password.");
 const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error)return toast(error.message);
 state.user=data.user; await loadData(); startRealtime();
}
async function signup(){
 const email=$("#username").value.trim(), password=$("#password").value;
 if(!email || password.length<6)return toast("Use an email and a password with at least 6 characters.");
 const {data,error}=await db.auth.signUp({email,password});
 if(error)return toast(error.message);
 if(data.session){state.user=data.user; await loadData(); startRealtime();}
 else toast("Account created. Check your email to confirm, then sign in.");
}
async function logout(){ await db.auth.signOut(); stopRealtime(); state.user=null; state.products=[]; state.transactions=[]; state.cart=[]; render(); }

function nav(){
 return `<aside class="side"><div class="side-brand"><img src="assets/logo.png"><div>Maila's<br>General Merchandise</div></div>
 <nav class="nav">${[["dashboard","▦","Dashboard"],["inventory","▤","Inventory"],["sales","▣","Sales / POS"],["transactions","◷","Transactions"],["alerts","!","Low-stock Alerts"]].map(([id,ic,n])=>`<button class="${state.page===id?"active":""}" onclick="state.page='${id}';render()">${ic} <span>${n}</span></button>`).join("")}</nav>
 <div class="side-user">${esc(state.user?.email||"")}</div><button class="logout" onclick="logout()">⇥ <span>Logout</span></button></aside>`;
}
function dashboard(){
 const t=totals(),low=state.products.filter(p=>p.quantity<=p.reorderLevel);
 return `<div class="top"><div><h1>Dashboard</h1><div class="muted">Live inventory and sales overview</div></div><div class="pill">● Connected to cloud database</div></div>
 <div class="cards"><div class="card"><div class="label">Products</div><div class="num">${state.products.length}</div></div><div class="card"><div class="label">Units in Stock</div><div class="num">${t.items}</div></div><div class="card"><div class="label">Inventory Value</div><div class="num">${money(t.value)}</div></div><div class="card"><div class="label">Recorded Sales</div><div class="num">${money(t.sales)}</div></div></div>
 <div class="grid"><div class="panel"><h3>Recent Transactions</h3>${txTable(state.transactions.slice(0,8))}</div><div class="panel"><h3>Low-stock Alerts</h3>${low.length?low.slice(0,8).map(p=>`<div class="cart-row"><span>${esc(p.name)||"(Unnamed product)"}</span><span class="badge ${status(p)[0]}">${p.quantity}</span></div>`).join(""):"<div class='muted'>No low-stock items.</div>"}</div></div>`;
}
function txTable(rows){
 if(!rows.length)return `<div class="muted">No transactions recorded yet.</div>`;
 return `<div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Date</th><th>Items</th><th>Total</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${esc(t.id)}</td><td>${new Date(t.date).toLocaleString()}</td><td>${t.items.reduce((a,x)=>a+x.qty,0)}</td><td>${money(t.total)}</td></tr>`).join("")}</tbody></table></div>`;
}
function inventory(){
 return `<div class="top"><div><h1>Inventory</h1><div class="muted">Cloud-synchronized inventory. 20% markup formula.</div></div><button class="btn primary-sm" onclick="openProduct()">+ Add Product</button></div>
 <div class="toolbar"><input id="search" placeholder="Search item..." oninput="renderInventoryTable()"><select id="filter" onchange="renderInventoryTable()"><option value="">All status</option><option value="ok">Stock Available</option><option value="low">Low Stock</option><option value="out">Out of Stock</option></select></div><div class="panel"><div id="invtable"></div></div>`;
}
function renderInventoryTable(){
 const q=($("#search")||{}).value?.toLowerCase()||"",f=($("#filter")||{}).value||""; let ps=state.products.filter(p=>(p.name||"").toLowerCase().includes(q)); if(f)ps=ps.filter(p=>status(p)[0]===f);
 $("#invtable").innerHTML=`<div class="table-wrap"><table><thead><tr><th>Item</th><th>SRP</th><th>Markup Price</th><th>Qty</th><th>Status</th><th>Actions</th></tr></thead><tbody>${ps.map(p=>{let s=status(p);return `<tr><td>${esc(p.name)||"(Unnamed product)"}</td><td>${money(p.srp)}</td><td>${money(p.price)}</td><td>${p.quantity}</td><td><span class="badge ${s[0]}">${s[1]}</span></td><td><button class="btn" onclick="openProduct('${esc(p.id)}')">Edit</button></td></tr>`}).join("")}</tbody></table></div>`;
}
function sales(){
 return `<div class="top"><div><h1>Sales / POS</h1><div class="muted">Select products, build a cart, take payment, and print a receipt.</div></div></div>
 <div class="pos"><div><div class="toolbar"><input id="possearch" placeholder="Search products..." oninput="renderPOSProducts()"></div><div class="products" id="posproducts"></div></div>
 <div class="panel"><h3>Current Sale</h3><div id="cart"></div><div class="total" id="carttotal">${money(cartTotal())}</div><button class="btn primary-sm" style="width:100%" onclick="checkout()">Checkout & Print Receipt</button></div></div>`;
}
function renderPOSProducts(){
 const q=($("#possearch")||{}).value?.toLowerCase()||"";
 $("#posproducts").innerHTML=state.products.filter(p=>(p.name||"").toLowerCase().includes(q)&&p.quantity>0).map(p=>`<div class="product"><h4>${esc(p.name)||"(Unnamed)"}</h4><div class="muted">Stock: ${p.quantity}</div><div class="price">${money(p.price)}</div><button class="btn blue" onclick="addCart('${esc(p.id)}')">Add to cart</button></div>`).join("")||`<div class="muted">No products available.</div>`;
}
function cartTotal(){return state.cart.reduce((a,x)=>a+x.price*x.qty,0)}
function addCart(id){const p=state.products.find(x=>x.id===id);if(!p)return;const c=state.cart.find(x=>x.id===id);if(c){if(c.qty<p.quantity)c.qty++;else toast("Not enough stock")}else state.cart.push({id:p.id,name:p.name,price:p.price,qty:1});render();}
function changeQty(id,d){const c=state.cart.find(x=>x.id===id),p=state.products.find(x=>x.id===id);if(!c)return;c.qty+=d;if(c.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);else if(c.qty>p.quantity)c.qty=p.quantity;render();}
function renderCart(){return state.cart.length?state.cart.map(c=>`<div class="cart-row"><div><b>${esc(c.name)||"(Unnamed)"}</b><div class="muted">${money(c.price)} × ${c.qty}</div></div><div class="qty"><button onclick="changeQty('${esc(c.id)}',-1)">−</button><span>${c.qty}</span><button onclick="changeQty('${esc(c.id)}',1)">+</button></div></div>`).join(""):`<div class="muted">Cart is empty.</div>`}
function transactions(){return `<div class="top"><div><h1>Transactions</h1><div class="muted">Completed sales stored in the central cloud database.</div></div></div><div class="panel">${txTable(state.transactions)}</div>`}
function alerts(){const ps=state.products.filter(p=>p.quantity<=p.reorderLevel);return `<div class="top"><div><h1>Low-stock Alerts</h1><div class="muted">Products at or below their reorder level.</div></div></div><div class="panel">${ps.length?`<table><thead><tr><th>Item</th><th>Qty</th><th>Reorder Level</th><th>Status</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${esc(p.name)||"(Unnamed)"}</td><td>${p.quantity}</td><td>${p.reorderLevel}</td><td><span class="badge ${status(p)[0]}">${status(p)[1]}</span></td></tr>`).join("")}</tbody></table>`:"<div class='muted'>No low-stock alerts.</div>"}</div>`}

function openProduct(id){
 const p=id?state.products.find(x=>x.id===id):{id:"P-"+Date.now(),name:"",srp:0,price:0,quantity:0,reorderLevel:5,category:"Uncategorized"};
 $("#modal").innerHTML=`<div class="modal-card"><h3>${id?"Edit Product":"Add Product"}</h3><div class="field"><label>Item name</label><input id="pn" value="${esc(p.name)}"></div><div class="field"><label>SRP / Cost</label><input id="psrp" type="number" step="0.01" value="${p.srp||0}"></div><div class="field"><label>Quantity</label><input id="pqty" type="number" value="${p.quantity||0}"></div><div class="field"><label>Reorder level</label><input id="prl" type="number" value="${p.reorderLevel||5}"></div><div class="field"><label>Category</label><input id="pcat" value="${esc(p.category)}"></div><div style="display:flex;gap:8px"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary-sm" onclick="saveProduct('${esc(p.id)}',${!!id})">Save</button></div></div>`;
 $("#modal").classList.add("open");
}
async function saveProduct(id,editing){
 const srp=+$("#psrp").value||0;
 const payload={id,name:$("#pn").value.trim(),srp,price:round(srp*1.2),quantity:Math.max(0,+$("#pqty").value||0),reorder_level:Math.max(0,+$("#prl").value||0),category:$("#pcat").value.trim()||"Uncategorized"};
 if(!payload.name)return toast("Item name is required.");
 const r=editing?await db.from("products").update(payload).eq("id",id):await db.from("products").insert(payload);
 if(r.error){console.error(r.error);return toast(r.error.message)}
 closeModal(); await loadData(); toast("Product saved");
}
function round(n){return Math.round(n*100)/100}
function checkout(){
 if(!state.cart.length)return toast("Cart is empty");
 const total=cartTotal();
 $("#modal").innerHTML=`<div class="modal-card"><h3>Payment</h3><p>Total: <b>${money(total)}</b></p><div class="field"><label>Cash received</label><input id="cash" type="number" step="0.01" value="${total}"></div><div id="change" class="muted"></div><div style="display:flex;gap:8px"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary-sm" onclick="completeSale()">Complete Sale</button></div></div>`;
 $("#modal").classList.add("open"); $("#cash").oninput=()=>$("#change").textContent="Change: "+money((+$("#cash").value||0)-total); $("#cash").oninput();
}
async function completeSale(){
 const total=cartTotal(),cash=+$("#cash").value||0;if(cash<total)return toast("Payment is insufficient");
 const items=state.cart.map(x=>({product_id:x.id,quantity:x.qty}));
 const {data,error}=await db.rpc("complete_sale",{p_items:items,p_cash:cash});
 if(error){console.error(error);return toast(error.message)}
 const tx=data;
 state.cart=[]; closeModal(); await loadData(); printReceipt(tx);
}
function printReceipt(t){
 const w=window.open("","receipt","width=420,height=700");if(!w)return;
 w.document.write(`<html><head><title>${esc(t.id)}</title><style>body{font-family:monospace;padding:20px}.r{text-align:right}table{width:100%}td{padding:4px 0}.line{border-top:1px dashed #000;margin:10px 0}</style></head><body><div class="receipt"><h2>Maila's General Merchandise</h2><div style="text-align:center">OFFICIAL SALES RECEIPT</div><div class="line"></div><div>Receipt: ${esc(t.id)}<br>${new Date(t.date||t.transaction_date).toLocaleString()}</div><div class="line"></div><table>${(t.items||[]).map(x=>`<tr><td>${esc(x.name)} × ${x.qty}</td><td class="r">${money(x.price*x.qty)}</td></tr>`).join("")}</table><div class="line"></div><table><tr><td>TOTAL</td><td class="r">${money(t.total)}</td></tr><tr><td>CASH</td><td class="r">${money(t.cash)}</td></tr><tr><td>CHANGE</td><td class="r">${money(t.change)}</td></tr></table><div class="line"></div><div style="text-align:center">Thank you for shopping with us!</div></div><script>window.print();<\/script></body></html>`);w.document.close();
}
function closeModal(){ $("#modal").classList.remove("open"); }
function loginScreen(){
 return `<div class="login"><div class="login-card"><img class="logo" src="assets/logo.png"><div class="brand">Maila's General Merchandise</div><div class="muted">Cloud Inventory & Point of Sale</div><div class="field"><label>Email</label><input id="username" type="email" placeholder="your@email.com"></div><div class="field"><label>Password</label><input id="password" type="password" placeholder="At least 6 characters"></div><button class="primary" onclick="login()">Sign in</button><button class="btn" style="width:100%;margin-top:8px" onclick="signup()">Create account</button><div class="demo-note">First-time setup: create a Supabase Auth account, then sign in. Data is shared across devices.</div></div></div>`;
}
function render(){
 if(!state.user){$("#app").innerHTML=loginScreen();return}
 let content=state.loading?`<div class="panel"><h3>Loading cloud data…</h3><div class="muted">Connecting to Supabase.</div></div>`:state.page==="dashboard"?dashboard():state.page==="inventory"?inventory():state.page==="sales"?sales():state.page==="transactions"?transactions():alerts();
 $("#app").innerHTML=`<div class="shell">${nav()}<main class="main">${content}</main></div><div id="modal" class="modal" onclick="if(event.target===this)closeModal()"></div><div id="toast" class="toast"></div>`;
 if(state.page==="inventory")renderInventoryTable();
 if(state.page==="sales"){renderPOSProducts();$("#cart").innerHTML=renderCart();$("#carttotal").textContent=money(cartTotal())}
}
(async function init(){
 const {data}=await db.auth.getSession();
 if(data.session){state.user=data.session.user; await loadData(); startRealtime();}
 else render();
 db.auth.onAuthStateChange(async (_event,session)=>{if(session && !state.user){state.user=session.user;await loadData();startRealtime();} if(!session && state.user){stopRealtime();state.user=null;state.products=[];state.transactions=[];render();}});
})();

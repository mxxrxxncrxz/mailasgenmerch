
const state={page:"dashboard",user:null,products:[],transactions:[],cart:[]};
const $=s=>document.querySelector(s);
const money=n=>"₱"+Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
function save(){localStorage.setItem("mailas_inventory",JSON.stringify({products:state.products,transactions:state.transactions}))}
function load(){
 const s=localStorage.getItem("mailas_inventory");
 if(s){try{Object.assign(state,JSON.parse(s));return}catch{}}
 fetch("data.json").then(r=>r.json()).then(d=>{state.products=d.products||[];state.transactions=d.transactions||[];save();render()});
}
function login(){
 const u=$("#username").value.trim(),p=$("#password").value;
 if(u==="admin"&&p==="admin123"){state.user={name:"Administrator",role:"Admin"};sessionStorage.setItem("mailas_user","1");render()}
 else toast("Demo login: admin / admin123");
}
function logout(){sessionStorage.removeItem("mailas_user");state.user=null;render()}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
function status(p){if(p.quantity<=0)return ['out','Out of Stock'];if(p.quantity<=p.reorderLevel)return ['low','Low Stock'];return ['ok','Stock Available']}
function totals(){
 return {
  items:state.products.reduce((a,p)=>a+Number(p.quantity||0),0),
  value:state.products.reduce((a,p)=>a+Number(p.quantity||0)*Number(p.price||0),0),
  sales:state.transactions.reduce((a,t)=>a+Number(t.total||0),0)
 }
}
function nav(){
 return `<aside class="side"><div class="side-brand"><img src="assets/logo.png"><div>Maila's<br>General Merchandise</div></div>
 <nav class="nav">${[
  ["dashboard","▦","Dashboard"],["inventory","▤","Inventory"],["sales","▣","Sales / POS"],["transactions","◷","Transactions"],["alerts","!","Low-stock Alerts"]
 ].map(([id,ic,n])=>`<button class="${state.page===id?"active":""}" onclick="state.page='${id}';render()">${ic} <span>${n}</span></button>`).join("")}</nav>
 <button class="logout" onclick="logout()">⇥ <span>Logout</span></button></aside>`;
}
function dashboard(){
 const t=totals(), low=state.products.filter(p=>p.quantity<=p.reorderLevel);
 return `<div class="top"><div><h1>Dashboard</h1><div class="muted">Inventory and sales overview</div></div><div class="pill">Signed in as ${state.user.name}</div></div>
 <div class="cards"><div class="card"><div class="label">Products</div><div class="num">${state.products.length}</div></div>
 <div class="card"><div class="label">Units in Stock</div><div class="num">${t.items}</div></div>
 <div class="card"><div class="label">Inventory Value</div><div class="num">${money(t.value)}</div></div>
 <div class="card"><div class="label">Recorded Sales</div><div class="num">${money(t.sales)}</div></div></div>
 <div class="grid"><div class="panel"><h3>Recent Transactions</h3>${txTable(state.transactions.slice(-8).reverse())}</div>
 <div class="panel"><h3>Low-stock Alerts</h3>${low.length?low.slice(0,8).map(p=>`<div class="cart-row"><span>${p.name||"(Unnamed product)"}</span><span class="badge ${status(p)[0]}">${p.quantity}</span></div>`).join(""):"<div class='muted'>No low-stock items.</div>"}</div></div>`;
}
function txTable(rows){
 if(!rows.length)return `<div class="muted">No transactions recorded yet.</div>`;
 return `<div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Date</th><th>Items</th><th>Total</th></tr></thead><tbody>${rows.map(t=>`<tr><td>${t.id}</td><td>${new Date(t.date).toLocaleString()}</td><td>${t.items.reduce((a,x)=>a+x.qty,0)}</td><td>${money(t.total)}</td></tr>`).join("")}</tbody></table></div>`;
}
function inventory(){
 return `<div class="top"><div><h1>Inventory</h1><div class="muted">Based on the workbook's INVENTORY sheet and 20% markup formula.</div></div><button class="btn primary-sm" onclick="openProduct()">+ Add Product</button></div>
 <div class="toolbar"><input id="search" placeholder="Search item..." oninput="renderInventoryTable()"><select id="filter" onchange="renderInventoryTable()"><option value="">All status</option><option value="ok">Stock Available</option><option value="low">Low Stock</option><option value="out">Out of Stock</option></select></div>
 <div class="panel"><div id="invtable"></div></div>`;
}
function renderInventoryTable(){
 const q=($("#search")||{}).value?.toLowerCase()||"",f=($("#filter")||{}).value||"";
 let ps=state.products.filter(p=>(p.name||"").toLowerCase().includes(q));
 if(f)ps=ps.filter(p=>status(p)[0]===f);
 $("#invtable").innerHTML=`<div class="table-wrap"><table><thead><tr><th>Item</th><th>SRP</th><th>Markup Price</th><th>Qty</th><th>Status</th><th>Actions</th></tr></thead><tbody>${ps.map(p=>{let s=status(p);return `<tr><td>${p.name||"(Unnamed product)"}</td><td>${money(p.srp)}</td><td>${money(p.price)}</td><td>${p.quantity}</td><td><span class="badge ${s[0]}">${s[1]}</span></td><td><button class="btn" onclick="openProduct('${p.id}')">Edit</button></td></tr>`}).join("")}</tbody></table></div>`;
}
function sales(){
 return `<div class="top"><div><h1>Sales / POS</h1><div class="muted">Select products, build a cart, take payment, and print a receipt.</div></div></div>
 <div class="pos"><div><div class="toolbar"><input id="possearch" placeholder="Search products..." oninput="renderPOSProducts()"></div><div class="products" id="posproducts"></div></div>
 <div class="panel"><h3>Current Sale</h3><div id="cart"></div><div class="total" id="carttotal">${money(cartTotal())}</div><button class="btn primary-sm" style="width:100%" onclick="checkout()">Checkout & Print Receipt</button></div></div>`;
}
function renderPOSProducts(){
 const q=($("#possearch")||{}).value?.toLowerCase()||"";
 $("#posproducts").innerHTML=state.products.filter(p=>(p.name||"").toLowerCase().includes(q)&&p.quantity>0).map(p=>`<div class="product"><h4>${p.name||"(Unnamed)"}</h4><div class="muted">Stock: ${p.quantity}</div><div class="price">${money(p.price)}</div><button class="btn blue" onclick="addCart('${p.id}')">Add to cart</button></div>`).join("")||`<div class="muted">No products available.</div>`;
}
function cartTotal(){return state.cart.reduce((a,x)=>a+x.price*x.qty,0)}
function addCart(id){const p=state.products.find(x=>x.id===id);if(!p)return;const c=state.cart.find(x=>x.id===id);if(c){if(c.qty<p.quantity)c.qty++;else toast("Not enough stock")}else state.cart.push({id:p.id,name:p.name,price:p.price,qty:1});render()}
function changeQty(id,d){const c=state.cart.find(x=>x.id===id),p=state.products.find(x=>x.id===id);if(!c)return;c.qty+=d;if(c.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);else if(c.qty>p.quantity)c.qty=p.quantity;render()}
function renderCart(){return state.cart.length?state.cart.map(c=>`<div class="cart-row"><div><b>${c.name||"(Unnamed)"}</b><div class="muted">${money(c.price)} × ${c.qty}</div></div><div class="qty"><button onclick="changeQty('${c.id}',-1)">−</button><span>${c.qty}</span><button onclick="changeQty('${c.id}',1)">+</button></div></div>`).join(""):`<div class="muted">Cart is empty.</div>`}
function transactions(){return `<div class="top"><div><h1>Transactions</h1><div class="muted">Completed sales stored in this browser/demo database.</div></div></div><div class="panel">${txTable(state.transactions.slice().reverse())}</div>`}
function alerts(){const ps=state.products.filter(p=>p.quantity<=p.reorderLevel);return `<div class="top"><div><h1>Low-stock Alerts</h1><div class="muted">Products at or below their reorder level.</div></div></div><div class="panel">${ps.length?`<table><thead><tr><th>Item</th><th>Qty</th><th>Reorder Level</th><th>Status</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${p.name||"(Unnamed)"}</td><td>${p.quantity}</td><td>${p.reorderLevel}</td><td><span class="badge ${status(p)[0]}">${status(p)[1]}</span></td></tr>`).join("")}</tbody></table>`:"<div class='muted'>No low-stock alerts.</div>"}</div>`}
function openProduct(id){
 const p=id?state.products.find(x=>x.id===id):{id:"P-"+Date.now(),name:"",srp:0,price:0,quantity:0,reorderLevel:5,category:"Uncategorized"};
 $("#modal").innerHTML=`<div class="modal-card"><h3>${id?"Edit Product":"Add Product"}</h3>
 <div class="field"><label>Item name</label><input id="pn" value="${p.name||""}"></div>
 <div class="field"><label>SRP / Cost</label><input id="psrp" type="number" step="0.01" value="${p.srp||0}"></div>
 <div class="field"><label>Quantity</label><input id="pqty" type="number" value="${p.quantity||0}"></div>
 <div class="field"><label>Reorder level</label><input id="prl" type="number" value="${p.reorderLevel||5}"></div>
 <div class="field"><label>Category</label><input id="pcat" value="${p.category||"Uncategorized"}"></div>
 <div style="display:flex;gap:8px"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary-sm" onclick="saveProduct('${p.id}',${!!id})">Save</button></div></div>`;
 $("#modal").classList.add("open");
}
function saveProduct(id,editing){const p={id,name:$("#pn").value.trim(),srp:+$("#psrp").value||0,price:round((+$("#psrp").value||0)*1.2),quantity:Math.max(0,+$("#pqty").value||0),reorderLevel:Math.max(0,+$("#prl").value||0),category:$("#pcat").value.trim()||"Uncategorized"};if(!editing)state.products.push(p);else state.products[state.products.findIndex(x=>x.id===id)]=p;save();closeModal();render();toast("Product saved")}
function round(n){return Math.round(n*100)/100}
function checkout(){
 if(!state.cart.length)return toast("Cart is empty");
 const total=cartTotal();
 $("#modal").innerHTML=`<div class="modal-card"><h3>Payment</h3><p>Total: <b>${money(total)}</b></p><div class="field"><label>Cash received</label><input id="cash" type="number" step="0.01" value="${total}"></div><div id="change" class="muted"></div><div style="display:flex;gap:8px"><button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary-sm" onclick="completeSale()">Complete Sale</button></div></div>`;
 $("#modal").classList.add("open");$("#cash").oninput=()=>$("#change").textContent="Change: "+money((+$("#cash").value||0)-total);
 $("#cash").oninput();
}
function completeSale(){
 const total=cartTotal(),cash=+$("#cash").value||0;if(cash<total)return toast("Payment is insufficient");
 const tx={id:"R-"+Date.now().toString().slice(-8),date:new Date().toISOString(),items:state.cart.map(x=>({...x})),total,cash,change:cash-total};
 state.cart.forEach(c=>{const p=state.products.find(x=>x.id===c.id);if(p)p.quantity=Math.max(0,p.quantity-c.qty)});
 state.transactions.push(tx);state.cart=[];save();closeModal();render();printReceipt(tx);
}
function printReceipt(t){
 const w=window.open("","receipt","width=420,height=700");if(!w)return;
 w.document.write(`<html><head><title>${t.id}</title><style>body{font-family:monospace;padding:20px}.r{text-align:right}table{width:100%}td{padding:4px 0}.line{border-top:1px dashed #000;margin:10px 0}</style></head><body><div class="receipt"><h2>Maila's General Merchandise</h2><div style="text-align:center">OFFICIAL SALES RECEIPT</div><div class="line"></div><div>Receipt: ${t.id}<br>${new Date(t.date).toLocaleString()}</div><div class="line"></div><table>${t.items.map(x=>`<tr><td>${x.name} × ${x.qty}</td><td class="r">${money(x.price*x.qty)}</td></tr>`).join("")}</table><div class="line"></div><table><tr><td>TOTAL</td><td class="r">${money(t.total)}</td></tr><tr><td>CASH</td><td class="r">${money(t.cash)}</td></tr><tr><td>CHANGE</td><td class="r">${money(t.change)}</td></tr></table><div class="line"></div><div style="text-align:center">Thank you for shopping with us!</div></div><script>window.print();<\/script></body></html>`);w.document.close()
}
function closeModal(){$("#modal").classList.remove("open")}
function render(){
 if(!state.user){$("#app").innerHTML=`<div class="login"><div class="login-card"><img class="logo" src="assets/logo.png"><div class="brand">Maila's General Merchandise</div><div class="muted">Inventory & Point of Sale</div><div class="field"><label>Username</label><input id="username" value="admin"></div><div class="field"><label>Password</label><input id="password" type="password" value="admin123"></div><button class="primary" onclick="login()">Sign in</button><div class="demo-note">Prototype login: admin / admin123</div></div></div>`;return}
 let content=state.page==="dashboard"?dashboard():state.page==="inventory"?inventory():state.page==="sales"?sales():state.page==="transactions"?transactions():alerts();
 $("#app").innerHTML=`<div class="shell">${nav()}<main class="main">${content}</main></div><div id="modal" class="modal" onclick="if(event.target===this)closeModal()"></div><div id="toast" class="toast"></div>`;
 if(state.page==="inventory")renderInventoryTable();
 if(state.page==="sales"){renderPOSProducts();$("#cart").innerHTML=renderCart();$("#carttotal").textContent=money(cartTotal())}
}
if(sessionStorage.getItem("mailas_user"))state.user={name:"Administrator",role:"Admin"};
load();setTimeout(render,100);

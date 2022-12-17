var express = require('express');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var session = require('express-session');

var app = express();
app.listen(3200);
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({secret:"secret"}));
app.set('view engine','ejs');

console.log('Listening on port 3200......');

function isProductInCart(cart,id){
    for(let i=0; i<cart.length; i++){
        if(cart[i].id == id){
            return true;
        }
    }
    return false;
}

function calculateTotal(cart,req){
    total = 0;
    for(let i=0; i< cart.length; i++){
        if(cart[i].sale_price){
            total = total + (cart[i].sale_price * cart[i].quantity);
        }else{
            total = total + (cart[i].price* cart[i].quantity);
        }
    }
    req.session.total = total;
    return total;
}

app.get('/',function(req,res){

    var conn = mysql.createConnection({
        host:'localhost',
        user:'root',
        password:'',
        database:'node_commerce',
    });
    conn.query("SELECT * FROM products",(err,result)=>{
        res.render('pages/index',{result:result});
    })
});

app.post('/add_to_cart',function(req,res){
    var id = req.body.id;
    var name = req.body.name;
    var price = req.body.price;
    var quantity = req.body.quantity;
    var sale_price = req.body.sale_price;
    var image = req.body.image;

    var product = {id:id,name:name,price:price,sale_price:sale_price,quantity:quantity,image:image};

    if(req.session.cart){
        var cart = req.session.cart;

        if(!isProductInCart(cart,id)){
            cart.push(product);
        }

    }else{
        req.session.cart = [product];
        var cart = req.session.cart;
    }

    calculateTotal(cart,req);

    res.redirect('/cart');
});

app.get('/cart', function(req,res){
    var conn = mysql.createConnection({
        host:'localhost',
        user:'root',
        password:'',
        database:'node_commerce',
    });

    var cart = req.session.cart;
    var total = req.session.total;

    res.render('pages/cart',{cart:cart,total:total});
});

app.post('/remove_product',function(req,res){
    var id = req.body.id;
    var cart = req.session.cart;

    for(let i =0; i<cart.length; i++){
        if(cart[i].id == id){
            cart.splice(cart.indexOf(i),1);
        }
    }
    //recalculate the total

    calculateTotal(cart,req);

    res.redirect('/cart');
});

app.post('/edit_product_quantity',function(req,res){
    // get values

    var id = req.body.id;
    var quantity = req.body.quantity;
    var  decrease = req.body.decrease_product;
    var increase = req.body.increase_product;

    var cart = req.session.cart;
    if(increase){
        for(let i=0; i<cart.length; i++){
            if(cart[i].id == id){
                if(cart[i].quantity > 0){
                    cart[i].quantity = parseInt(cart[i].quantity)+1;
                }
            }
        }
    }

   
    if(decrease){
        for(let i=0; i<cart.length; i++){
            if(cart[i].id == id){
                if(cart[i].quantity > 1){
                    cart[i].quantity = parseInt(cart[i].quantity)-1;
                }
            }
        }
    }

    calculateTotal(cart,req);

    res.redirect('/cart');
});

app.get('/checkout', function(req,res){
    var total = req.session.total;
    res.render('pages/checkout',{total:total});
});

app.post('/place_order', function(req,res){
    var name = req.body.name;
    var email = req.body.email;
    var phone = req.body.phone;
    var city = req.body.city;
    var address = req.body.address;
    var cost = req.session.total;
    var status = "not paid";
    var date = new Date();
    var product_ids ="";


    var conn = mysql.createConnection({
        host:'localhost',
        user:'root',
        password:'',
        database:'node_commerce',
    });

    var cart = req.session.cart;
    for(let i=0; i<cart.length; i++){
        product_ids = product_ids + "," +cart[i].id;
    }

    conn.connect((err) =>{
        if(err){
            console.log(err);
        }else{
            var query = "INSERT INTO orders(cost,name,email,phone,city,address,date,status,product_ids) VALUES?";
            var values =[
                [cost,name,email,phone,city,address,date,status,product_ids]
            ] 
            conn.query(query,[values],(err,result)=>{
                res.redirect('/payment')
            });
        }
    })
});

app.get('/payment',function(req,res){
    res.render('pages/payment');
})

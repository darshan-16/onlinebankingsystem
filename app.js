const express = require('express')
const mysql = require('mysql')
const fast2sms = require('fast-two-sms')
const session = require('express-session');
const excel = require('exceljs');
const path = require('path');

const app = express()
require('dotenv').config();
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: false }))

const db = mysql.createConnection({
    user: "root",
    host: "localhost",
    password: "password",
    database: "uno_bank_v2",
});

app.use(express.static(path.join(__dirname, 'public')));

var cid = ""
var cifsc = ""
var cpho = ""
var posts = []
var posts1 = []
var posts2 = []
var acc = ""
var pname = ""
var p = []

// Open Landing page
app.get('/', (req, res) => {
    res.render('landing.ejs')
})

// Open Login page
app.get('/login', (req, res) => {
    res.render('index.ejs')
})

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy
    res.redirect('/login')
})

// Help
app.get('/home/help', (req, res) => {
    res.render("help.ejs")
})

// Feedback
app.get('/home/help/feedback', (req, res) => {
    res.render("feedback.ejs")
})

// Feedback post
app.post('/home/help/feedback/send', (req, res) => {
    res.redirect("/home/help")
})

// Polls and Surveys
app.get('/home/help/polls', (req, res) => {
    res.render("polls.ejs")
})

app.post('/home/help/polls/send', (req, res) => {
    res.redirect("/home/help")
})

// OTP sending
app.post('/sendmessage', function (request, response) {
    let username = request.body.uname;
	let password = request.body.pass;
    console.log(username)
    console.log(password)
	if (username && password) {
		db.query('SELECT consumer_id, consumer_phone_number, bank_bank_ifsc FROM consumer where consumer_id = ? and consumer_password = ?', [username, password], function(error, results, fields) {
			if (error)throw error;
			if (results.length > 0) {
                cifsc = results[0].bank_bank_ifsc
                console.log(results[0].consumer_phone_number)
                cid = results[0].consumer_id
                request.session.cpno = results[0].consumer_phone_number
                console.log(cid)
                cpho = results[0].consumer_phone_number
                const re = fast2sms.sendMessage({ authorization: process.env.API_KEY, message: generateOTP(), numbers: [parseInt(results[0].consumer_phone_number)]})
                response.redirect('/otp');
			} else {
				response.send('Incorrect Username and/or Password!');
                response.redirect("/")
			}
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
})

// Open OTP page
app.get('/otp', function(req, res) {
    res.render('otp.ejs')
})

// Verify OTP
app.post('/verify', function(req, res){
    let otp = req.body.otp;
    var flag = 0
    db.query('SELECT otp, sent FROM otp where consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            console.log(results[0].sent)
            flag = verifyOTP(otp, results[0].otp, results[0].sent)
            if(flag){
                req.session.loggedin = true;
                req.session.username = results[0].consumer_id;
                console.log("Success")
                res.redirect('/home/getdata');
            }
            else{
                console.log("Fail")
                res.redirect('/otp')
            }
        }
        
    })
    
})

// Dashboard
app.get('/home/getdata', function(req, res) {
    db.query('SELECT * FROM consumer_transaction where account_from_account_number in (SELECT account_number FROM consumer_account WHERE consumer_consumer_id =?)', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            posts1 = []
            console.log("Entered")
            for(var i=0; i<results.length; i++){
                var d = {}
                d.transaction_id = results[i].transaction_id.toString()
                d.account_to_account_number = results[i].account_to_account_number
                d.transaction_status = results[i].transaction_status
                d.transaction_amount = results[i].transaction_amount
                posts1.push(d)
            }
            console.log(posts1)
        }
        db.query('SELECT account_number FROM consumer_account WHERE consumer_consumer_id =?', [cid], function(error, results, fields) {
            if(error)throw error;
            if (results.length>0){
                posts = []
                for(var i=0; i<results.length; i++){
                    var d = {}
                    d.account_number = results[i].account_number
                    posts.push(d)
                }
                console.log(posts)
                db.query('SELECT * FROM consumer WHERE consumer_id =?', [cid], function(error, results, fields) {
                    if(error)throw error;
                    console.log(results[0].credit_points.toString())
                    posts2 = []
                    var d = {}
                    d.credit_points = results[0].credit_points.toString()
                    posts2.push(d)
                    console.log(posts2)
                })
            }
        })
            
        
    })
    res.redirect("/home")
})

app.get('/home', function(req, res) {
    res.render("home.ejs", {articles : posts1, art : posts, eg : posts2})
})

// Open fund transfer home page
app.get('/home/fundtransfer', function(req, res) {
    res.render("fundtransfer_home.ejs")
})

// Open quick pay page
app.get('/home/fundtransfer/quickpay', function(req, res) {
    res.render("quickpay.ejs", {ar : posts1})
})

// Redirect to quick pay page
app.get('/home/fundtransfer/quickpay/getdata', function(req, res) {
    db.query('SELECT * FROM consumer_account where consumer_consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            posts1 = []
            for(var i=0; i<results.length; i++){
                var d = {}
                d.accno = results[i].account_number
                d.balance = results[i].account_balance
                posts1.unshift(d)
            }
        }
    })
    res.redirect("/home/fundtransfer/quickpay")
})

// Transfer amount
app.post('/home/fundtransfer/quickpay/send', function(req, res){
    var bal1, bal2;
    var timestamp1 = new Date().getTime();
    t1 = timestamp1.toString()
    db.query('SELECT bank_ifsc FROM branch where bank_ifsc = ?', [req.body.pifsc], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            db.query('SELECT consumer_online_pin FROM consumer where consumer_id = ?', [cid], function(error, results, fields) {
                if(error)throw error;
                if (results.length>0){
                    if (results[0].consumer_online_pin == req.body.key){
                        db.query('SELECT account_balance FROM consumer_account where consumer_consumer_id = ?', [cid], function(error, results, fields) {
                            if(error)throw error;
                            if (results.length>0){ 
                                bal1 = results[0].account_balance 
                                console.log(typeof(req.body.amt))
                                console.log(bal1)
                                console.log(typeof(bal1))
                                db.query('UPDATE consumer_account SET account_balance = ? where consumer_consumer_id=?', [parseInt(bal1)-parseInt(req.body.amt), cid], function(error, results, fields) {
                                    if(error)throw error;
                                    else{
                                        console.log("Updated from payee")
                                        db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1,cifsc, req.body.acc.substr(0, 10), req.body.pifsc, req.body.paccno, "IMPS", req.body.amt, "Debit", 0], function(error, results, fields) {
                                            if(error)throw error;
                                            else{console.log("Inserted debit")}
                                    })}
                                })
                            }
                            console.log(req.body.paccno)
                            db.query('SELECT account_balance FROM consumer_account where account_number = ?', [req.body.paccno], function(error, results1, fields) {
                                if(error)throw error;
                                console.log(results1.length)
                                console.log(results1)
                                if (results1.length>0){ 
                                    bal2 = results1[0].account_balance
                                    db.query('UPDATE consumer_account SET account_balance = ? where account_number = ?', [parseInt(bal2)+parseInt(req.body.amt), req.body.paccno], function(error, results, fields) {
                                        if(error)throw error;
                                        else{
                                            console.log("Updated to payee")
                                            db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, req.body.pifsc, req.body.paccno, cifsc, req.body.acc.substr(0, 10), "IMPS", req.body.amt, "Credit", 0], function(error, results, fields) {
                                                if(error)throw error;
                                                else{console.log("Inserted credit")}
                                            })
                                        }
                                    })
                                }
                            })
                        })
                    }
                    else{
                        console.log("Failed payment")
                        res.redirect('/home/fail')
                    }
                }
                else{
                    console.log("Failed payment")
                    res.redirect('/home/fail')
                }
            })
        }
        else{
            console.log("Failed payment")
            res.redirect('/home/fail')
        }
    })
    
    res.redirect('/home/success')
})

// Redirect to Fund transfer page
app.get('/home/fundtransfer/fund/getdata', function(req, res) {
    db.query('SELECT * FROM payee where consumer_consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            posts = []
            for(var i=0; i<results.length; i++){
                var d = {}
                d.title = results[i].payee_name
                d.accno = results[i].payee_account_number
                d.ifsc = results[i].bank_bank_ifsc
                posts.push(d)
            }
        }
    })
    db.query('SELECT * FROM consumer_account where consumer_consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            posts1 = []
            for(var i=0; i<results.length; i++){
                var d = {}
                d.accno = results[i].account_number
                d.balance = results[i].account_balance
                posts1.unshift(d)
            }
        }
    })
    res.redirect("/home/fundtransfer/fund")
})

// Open fund transfer page
app.get('/home/fundtransfer/fund', function(req, res) {
    res.render("fundtransfer.ejs", {articles : posts, ar : posts1})
})

// Transfer amount
app.post('/home/fundtransfer/fund/send', function(req, res){
    var bal1, bal2;
    var timestamp1 = new Date().getTime();
    t1 = timestamp1.toString()
    db.query('SELECT consumer_online_pin FROM consumer where consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            if (results[0].consumer_online_pin == req.body.key){
                db.query('SELECT account_balance FROM consumer_account where consumer_consumer_id = ?', [cid], function(error, results, fields) {
                    if(error)throw error;
                    if (results.length>0){ 
                        bal1 = results[0].account_balance 
                        console.log(typeof(req.body.amt))
                        console.log(bal1)
                        console.log(typeof(bal1))
                        db.query('UPDATE consumer_account SET account_balance = ? where consumer_consumer_id=?', [parseInt(bal1)-parseInt(req.body.amt), cid], function(error, results, fields) {
                            if(error)throw error;
                            else{
                                console.log("Updated from payee")
                                db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1,cifsc, req.body.acc.substr(0, 10), req.body.payee.substr(10,), req.body.payee.substr(0,10), "IMPS", req.body.amt, "Debit", 0], function(error, results, fields) {
                                    if(error)throw error;
                                    else{console.log("Inserted debit")}
                            })}
                        })
                    }
                    console.log(req.body.payee.substr(0,10))
                    db.query('SELECT account_balance FROM consumer_account where account_number = ?', [req.body.payee.substr(0,10)], function(error, results1, fields) {
                        if(error)throw error;
                        console.log(results1.length)
                        console.log(results1)
                        if (results1.length>0){ 
                            bal2 = results1[0].account_balance
                            db.query('UPDATE consumer_account SET account_balance = ? where account_number = ?', [parseInt(bal2)+parseInt(req.body.amt), req.body.payee.substr(0,10)], function(error, results, fields) {
                                if(error)throw error;
                                else{
                                    console.log("Updated to payee")
                                    db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, req.body.payee.substr(10,), req.body.payee.substr(0,10), cifsc, req.body.acc.substr(0, 10), "IMPS", req.body.amt, "Credit", 0], function(error, results, fields) {
                                        if(error)throw error;
                                        else{console.log("Inserted credit")}
                                    })
                                }
                            })
                        }
                    })
                })
            }
        }
        else{
            console.log("Failed payment")
        }
    })
    res.redirect('/home/success')
})

// Open Manage page
app.get('/home/managepayee', function(req, res) {
    res.render("managepayee.ejs")
})

// Open Add Payee page
app.get('/home/managepayee/addpayee', function(req, res) {
    res.render("addpayee.ejs")
})

// Open Success page
app.get('/home/success', function(req, res) {
    res.render("success.ejs")
})

// Open Veiw Payee page
app.get('/home/managepayee/viewpayee/getdata', function(req, res) {
    db.query('SELECT * FROM payee where consumer_consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            p = []
            for(var i=0; i<results.length; i++){
                var d = {}
                d.payee_account_number = results[i].payee_account_number
                d.payee_name = results[i].payee_name
                d.bank_ifsc = results[i].bank_bank_ifsc
                p.push(d)
            }
        }
    })
    res.redirect("/home/managepayee/viewpayee")
})

app.get('/home/managepayee/viewpayee', function(req, res) {
    res.render("viewpayee.ejs", {articles : p})
})

// Open Update payee page
app.get('/home/managepayee/updatepayee/getdata', function(req, res) {
    db.query('SELECT * FROM payee where consumer_consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            p = []
            for(var i=0; i<results.length; i++){
                var d = {}
                d.accno = results[i].payee_account_number
                p.push(d)
            }
        }
    })
    res.redirect("/home/managepayee/updatepayee")
})

app.get('/home/managepayee/updatepayee', function(req, res) {
    res.render("updatepayee.ejs", {articles : p})
})

app.post('/home/managepayee/updatepayee/send', function(req, res){
    acc = req.body.acc
    pname = req.body.name
    const re = fast2sms.sendMessage({ authorization: process.env.API_KEY, message: generateOTP(), numbers: [parseInt(cpho)]})
    res.redirect('/home/managepayee/updatepayee/verify')
})

// Open OTP page
app.get('/home/managepayee/updatepayee/verify', function(req, res) {
    res.render("updatepayee_otp.ejs")
})

// Verify OTP in add payee
app.post('/home/managepayee/updatepayee/verify', function(req, res){
    var otp = req.body.otp
    db.query('SELECT otp, sent FROM otp where consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            console.log(results[0].sent)
            flag = verifyOTP(otp, results[0].otp, results[0].sent)
            console.log(cid)
            if(flag){
                console.log("Success")
                db.query('UPDATE payee SET payee_name = ? where consumer_consumer_id=? and payee_account_number = ?', [pname, cid, acc], function(error, results, fields) {
                    if(error)throw error;
                    else{
                        console.log("Updated name")
                        res.redirect('/home/success')
                    }
                })
            }
            else{
                console.log("Fail Deletion")
                res.redirect('/home/managepayee')
            }
        }
    })
})

// Open Delete payee page
app.get('/home/managepayee/deletepayee/getdata', function(req, res) {
    db.query('SELECT * FROM payee where consumer_consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            p = []
            for(var i=0; i<results.length; i++){
                var d = {}
                d.accno = results[i].payee_account_number
                p.push(d)
            }
        }
    })
    res.redirect("/home/managepayee/deletepayee")
})

app.get('/home/managepayee/deletepayee', function(req, res) {
    res.render("deletepayee.ejs", {articles : p})
})

app.post('/home/managepayee/deletepayee/send', function(req, res){
    acc = req.body.acc
    const re = fast2sms.sendMessage({ authorization: process.env.API_KEY, message: generateOTP(), numbers: [parseInt(cpho)]})
    res.redirect('/home/managepayee/deletepayee/verify')
})

// Open OTP page
app.get('/home/managepayee/deletepayee/verify', function(req, res) {
    res.render("deletepayee_otp.ejs")
})

// Verify OTP in add payee
app.post('/home/managepayee/deletepayee/verify', function(req, res){
    var otp = req.body.otp
    db.query('SELECT otp, sent FROM otp where consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            console.log(results[0].sent)
            flag = verifyOTP(otp, results[0].otp, results[0].sent)
            console.log(cid)
            if(flag){
                console.log("Success")
                db.query('DELETE FROM payee where consumer_consumer_id=? and payee_account_number = ?', [cid, acc], function(error, results, fields) {
                    if(error)throw error;
                    else{
                        console.log("Deleted name")
                        res.redirect("/home/success")
                    }
                })
            }
            else{
                console.log("Fail Deletion")
                res.redirect('/home/managepayee')
            }
        }
    })
})

// Open OTP page
app.get('/home/managepayee/addpayee/verify', function(req, res) {
    res.render("addpayee_otp.ejs")
})

// OTP send in add payee
var paccn, pname, pifsc, paccno
app.post('/home/managepayee/addpayee/add', function(req, res){
    paccn = req.body.paccn
    pname = req.body.pname
    pifsc = req.body.pifsc
    paccno = req.body.paccno
    const re = fast2sms.sendMessage({ authorization: process.env.API_KEY, message: generateOTP(), numbers: [parseInt(cpho)]})
    res.redirect('/home/managepayee/addpayee/verify')
})

// Verify OTP in add payee
app.post('/home/managepayee/addpayee/verify', function(req, res){
    var otp = req.body.otp
    db.query('SELECT otp, sent FROM otp where consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            console.log(results[0].sent)
            flag = verifyOTP(otp, results[0].otp, results[0].sent)
            console.log(cid)
            if(flag){
                console.log("Success")
                db.query('INSERT INTO payee (consumer_consumer_id, payee_name, payee_nick_name, payee_account_number, bank_bank_ifsc) VALUES (?, ?, ?, ?, ?)', [cid, paccn, pname, paccno, pifsc], function(error, results, fields) {
                    if(error)throw error;
                    else{
                        console.log("Inserted payee details")
                        res.redirect("/home/success")
                    }
                })
            }
            else{
                console.log("Fail")
                res.redirect('/home/managepayee')
            }
        }
    })
})

// Get data for E-Statement
app.get('/home/estatement/getdata', function(req, res) {
    db.query('SELECT * FROM consumer_account where consumer_consumer_id = ?', [cid], function(error, results, fields) {
        if(error)throw error;
        if (results.length>0){
            posts1 = []
            for(var i=0; i<results.length; i++){
                var d = {}
                d.accno = results[i].account_number
                d.balance = results[i].account_balance
                posts1.push(d)
            }
        }
    })
    res.redirect("/home/estatement")
})

// Open E-Statement page
app.get('/home/estatement', function(req, res) {
    res.render("estatement.ejs", {articles : posts1})
})

app.post('/home/estatement/download', function(req, res) {
    db.query('SELECT * FROM consumer_transaction where account_from_account_number = ?', [req.body.acc], function(error, results, fields) {
        if(error)throw error;
        const jsonTransac = JSON.parse(JSON.stringify(results));
        console.log(jsonTransac);
        let workbook = new excel.Workbook(); //creating workbook
		let worksheet = workbook.addWorksheet('Transactions');

        worksheet.columns = [
			{ header: 'Transaction ID', key: 'transaction_id', width: 30 },
			{ header: 'Transaction Time', key: 'transaction_time', width: 30 },
			{ header: 'IFSC', key: 'bank_from_ifsc', width: 30},
			{ header: 'Account Number', key: 'account_from_account_number', width: 30},
            { header: 'Other Account IFSC', key: 'bank_to_ifsc', width: 30 },
			{ header: 'Other Account Number', key: 'account_to_account_number', width: 30 },
			{ header: 'Transaction Method', key: 'transaction_transaction_method', width: 30},
			{ header: 'Transaction Amount', key: 'transaction_amount', width: 30},
            { header: 'Transaction Status', key: 'transaction_status', width: 30},
			{ header: 'Transaction Charge', key: 'transaction_charge', width: 30}
		];

        worksheet.addRows(jsonTransac);

        workbook.xlsx.writeFile("e-statement.xlsx")
		.then(function() {
			console.log("File saved!");
		});
    })
    res.redirect("/home/getdata")
})



app.listen(3000, () => {
    console.log("Started server at 3000");
})

function generateOTP() {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 4; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    var timestamp1 = new Date().getTime();
    console.log(timestamp1.toString())
    db.query('SELECT * FROM otp where consumer_id=?', [cid], function(error, results, fields) {
        if(error)throw error;
        if(results.length>0){
            db.query('UPDATE otp SET otp = ?, sent =? where consumer_id=?', [OTP, timestamp1.toString(), cid], function(error, results, fields) {
                if(error)throw error;
                else{console.log("Updated")}
            })
        }
        else{
            db.query('INSERT INTO otp (consumer_id, otp, sent) VALUES (?,?,?)', [cid, OTP, timestamp1.toString()], function(error, results, fields) {
                if(error)throw error;
                else{console.log("Inserted")}
            })
        }
    })
    console.log(OTP)
    return OTP;
}

function timeDifference(t1, t2) {
    difference = t2 - t1
    var daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
    difference -= daysDifference * 1000 * 60 * 60 * 24

    var hoursDifference = Math.floor(difference / 1000 / 60 / 60);
    difference -= hoursDifference * 1000 * 60 * 60

    var minutesDifference = Math.floor(difference / 1000 / 60);
    difference -= minutesDifference * 1000 * 60

    var secondsDifference = Math.floor(difference / 1000);

    console.log('difference = ' + daysDifference + ' day/s ' + hoursDifference + ' hour/s ' + minutesDifference + ' minute/s ' + secondsDifference + ' second/s ');
    return minutesDifference
}

function verifyOTP(otp, otp1, t1){
    console.log(otp)
    console.log(parseInt(t1))
    var ts2 = new Date().getTime();
    t2 = parseInt(ts2.toString())
    console.log(t2)
    tdm = timeDifference(t1, t2)
    if (tdm<3 && otp1 == otp){
        return true
    }
}
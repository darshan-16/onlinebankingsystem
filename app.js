const express = require('express')
const mysql = require('mysql')
const fast2sms = require('fast-two-sms')
const session = require('express-session');
const excel = require('exceljs');
const path = require('path');
const res = require('express/lib/response');

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

// open signup page
app.get('/signup', (req, res) => {
    res.render('signup.ejs')
})

// signup form fill
app.post('/signup', (req, res) => {
    var r_consumer_first_name, r_consumer_last_name, r_consumer_phone_number, r_consumer_email, r_consumer_password
    r_consumer_first_name = req.body.fname
    r_consumer_last_name = req.body.lname
    r_consumer_phone_number = req.body.pno
    r_consumer_email = req.body.email
    r_consumer_password = req.body.pwd
    db.query('INSERT INTO req_consumer(r_consumer_first_name, r_consumer_last_name, r_consumer_phone_number, r_consumer_email, r_consumer_password) VALUES (?,?,?,?,?)', [r_consumer_first_name, r_consumer_last_name, r_consumer_phone_number, r_consumer_email, r_consumer_password], function (err, results) {
        if (err) throw err
        else {
            console.log("Request sent")
            res.redirect('/reqsent')
        }
    })
})

// Request sent page
app.get('/reqsent', (req, res) => {
    res.render('sent_req.ejs')
})

// Activate account
app.get('/activate', (req, res) => {
    res.render('activate_acc.ejs')
})

// Account activation - pin setting
app.post('/activate', (req, res) => {
    var uname, pwd, npin
    uname = req.body.uname
    pwd = req.body.pwd
    npin = req.body.npin
    if (uname && pwd) {
        db.query('SELECT consumer_id, activation FROM consumer where consumer_id = ? and consumer_password = ?', [uname, pwd], function (err, results, fields) {
            if (err) throw err
            else if ((results.length > 0) && (results[0].activation == 0)) {
                cid = results[0].consumer_id
                db.query('UPDATE consumer SET consumer_online_pin=?, activation=? where consumer_id=?', [npin, 1, cid], function (err, results) {
                    if (err) throw err
                    else {
                        res.redirect('/activated')
                    }
                })
            }
            else {
                res.redirect('/invalid')
            }
        })
    }
    else {
        res.redirect('/invalid')
    }
})

// Activation msg
app.get('/activated', (re, res) => {
    res.render('activated.ejs')
})

// Invalid requests
app.get('/invalid', (req, res) => {
    res.render('invalid_req.ejs')
})

// Card controls
app.get('/home/card', (req, res) => {
    res.render('card_control.ejs')
})

// Add card page
app.get('/home/card/add', (req, res) => {
    res.render('add_card.ejs')
})

// Add card details
app.post('/home/card/add', (req, res) => {
    var card_number, card_type, card_pin, card_expiry_date, card_cvv, account_account_number, card_limit
    card_number = req.body.cno
    card_type = req.body.ctype
    card_pin = req.body.pin
    card_expiry_date = String(req.body.expdate)
    card_cvv = req.body.cvv
    db.query('SELECT account_number FROM consumer_account WHERE consumer_consumer_id=?', [cid], function (err, results) {
        account_account_number = results[0].account_number
        if (err) throw err
        else {
            db.query('INSERT INTO card(card_number, card_type, card_pin, card_expiry_date, card_cvv, account_account_number, consumer_consumer_id) VALUES (?,?,?,?,?,?,?)', [card_number, card_type, card_pin, card_expiry_date, card_cvv, account_account_number, cid], function (err, results) {
                if (err) throw err
                else {
                    console.log("Card added")
                    res.redirect('/home/success')
                }
            })
        }
    })
})

// Reset pin
app.get('/home/card/resetpin', (req, res) => {
    res.render('reset_cpin.ejs')
})

// Reset pin
app.post('/home/card/resetpin', (req, res) => {
    var curpin, rpin
    curpin = req.body.curpin
    rpin = req.body.rpin
    db.query('SELECT card_pin FROM card WHERE consumer_consumer_id=?', [cid], function (err, results) {
        if (err) throw err
        else if (results[0].card_pin == curpin) {
            db.query('UPDATE card SET card_pin=? where consumer_consumer_id=?', [rpin, cid], function (err, results) {
                if (err) throw err
                else {
                    console.log("Updated card")
                    res.redirect('/home/success')
                }
            })
        }
        else {
            res.redirect('/home/invalid')
        }
    })
})

// Apply Card
app.get('/home/card/applycard', (req, res) => {
    res.render('apply_card.ejs')
})

app.post('/home/card/applycard', (req, res) => {
    var curpin
    curpin = req.body.curpin
    db.query('SELECT card_pin FROM card WHERE consumer_consumer_id=?', [cid], function (err, results) {
        if (err) throw err
        else {
            res.redirect('/home/applied')
        }
    })
})

// Apply success
app.get('/home/applied', (req, res) => {
    res.render('applied.ejs')
})

// Change limit
app.get('/home/card/setlimit', (req, res) => {
    res.render('set_limit.ejs')
})

// Change limit
app.post('/home/card/setlimit', (req, res) => {
    var curpin, stlim
    curpin = req.body.curpin
    stlim = parseInt(req.body.stlmt)
    db.query('SELECT card_pin FROM card WHERE consumer_consumer_id=?', [cid], function (err, results) {
        if (err) throw err
        else if (results[0].card_pin == curpin) {
            db.query('UPDATE card SET card_limit=? where consumer_consumer_id=?', [stlim, cid], function (err, results) {
                if (err) throw err
                else {
                    console.log("Updated limit")
                    res.redirect('/home/success')
                }
            })
        }
        else {
            res.redirect('/home/invalid')
        }
    })
})

app.get('/home/invalid', (req, res) => {
    res.render('invalid.ejs')
})

app.get('/home/card/virtualcard', (req, res) => {
    var cno, expdate
    db.query('SELECT card_number, card_expiry_date FROM card WHERE consumer_consumer_id=?', [cid], function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            cno = results[0].card_number
            expdate = results[0].card_expiry_date
            db.query('SELECT consumer_first_name FROM consumer WHERE consumer_id=?', [cid], function (err, results) {
                if (err) throw err
                else {
                    var d = {}
                    posts1 = []
                    d.cno = cno
                    d.expdate = expdate
                    d.name = results[0].consumer_first_name
                    posts1.push(d)
                    console.log(posts1)
                    res.render('virtual_card.ejs', { articles: posts1 })
                }
            })
        }
        else {
            console.log("Invalid")
            res.redirect('/home/invalid')
        }
    })
})

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy
    res.redirect('/login')
})

// Admin
app.get('/admin', (req, res) => {
    db.query('SELECT * FROM req_consumer', function (err, results) {
        if (err) throw err
        else {
            posts1 = []
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.r_no = results[i].r_no
                d.r_consumer_first_name = results[i].r_consumer_first_name
                d.r_consumer_last_name = results[i].r_consumer_last_name
                d.r_consumer_phone_number = results[i].r_consumer_phone_number
                d.r_consumer_email = results[i].r_consumer_email
                posts1.push(d)
            }
            console.log(posts1)
            res.render('admin_home.ejs', { articles: posts1 })
        }
    })
})

app.post('/admin/accept', (req, res) => {
    var c_id, consumer_first_name, consumer_last_name, consumer_phone_number, consumer_email, consumer_password
    var r_id = req.body.accept
    db.query('SELECT * FROM req_consumer WHERE r_no=?', [r_id], function (err, results) {
        if (err) throw err
        else {
            consumer_first_name = results[0].r_consumer_first_name
            consumer_last_name = results[0].r_consumer_last_name
            consumer_phone_number = results[0].r_consumer_phone_number
            consumer_email = results[0].r_consumer_email
            consumer_password = results[0].r_consumer_password
            db.query('SELECT * FROM consumer', function (err, results) {
                if (err) throw err
                else {
                    console.log(results[results.length - 1].consumer_id)
                    c_id = String(parseInt(results[results.length - 1].consumer_id) + 1)
                    var acc_no = String(Math.floor(1000000000 + Math.random() * 9000000000));
                    console.log(c_id, acc_no)
                    db.query('INSERT INTO consumer(consumer_id, consumer_first_name, consumer_last_name, consumer_phone_number, consumer_email, consumer_password, consumer_online_pin, bank_bank_ifsc, credit_points, activation) VALUES (?,?,?,?,?,?,?,?,?,?)', [c_id, consumer_first_name, consumer_last_name, consumer_phone_number, consumer_email, consumer_password, '0000', 'UNOL0000001', 100, 0], function (err, results) {
                        if (err) throw err
                        else {
                            console.log("Inserted new consumer")
                            db.query('INSERT INTO consumer_account(account_number, account_account_type, consumer_consumer_id, account_balance) VALUES (?,?,?,?)', [acc_no, 'Savings', c_id, 5000], function (err, results) {
                                if (err) throw err
                                else {
                                    console.log("Inserted new consumer account")
                                    db.query('DELETE FROM req_consumer WHERE r_no=?', [r_id], function (err, results) {
                                        if (err) throw err
                                        else {
                                            console.log("Deleted request")
                                            res.redirect('/admin')
                                        }
                                    })
                                }
                            })
                        }
                    })

                }
            })
        }

    })

})

// Report Generation
app.get('/admin/reports', (req, res) => {
    res.render('reports.ejs')
})

app.post('/admin/reports/download', (req, res) => {
    console.log(req.body.report)
    if (req.body.report == "trep") {
        let workbook = new excel.Workbook(); //creating workbook
        let worksheet = workbook.addWorksheet('Transactions');

        worksheet.columns = [
            { header: 'Transaction ID', key: 'transaction_id', width: 30 },
            { header: 'Transaction Time', key: 'transaction_time', width: 30 },
            { header: 'IFSC', key: 'bank_from_ifsc', width: 30 },
            { header: 'Account Number', key: 'account_from_account_number', width: 30 },
            { header: 'Other Account IFSC', key: 'bank_to_ifsc', width: 30 },
            { header: 'Other Account Number', key: 'account_to_account_number', width: 30 },
            { header: 'Transaction Method', key: 'transaction_transaction_method', width: 30 },
            { header: 'Transaction Amount', key: 'transaction_amount', width: 30 },
            { header: 'Transaction Status', key: 'transaction_status', width: 30 },
            { header: 'Transaction Charge', key: 'transaction_charge', width: 30 }
        ];
        db.query('SELECT * FROM consumer_transaction', function (error, results, fields) {
            if (error) throw error;
            else {
                console.log(results)
                const jsonTransac = JSON.parse(JSON.stringify(results));
                console.log(jsonTransac);
                worksheet.addRows(jsonTransac);
                workbook.xlsx.writeFile("tr_statement.xlsx")
                    .then(function () {
                        console.log("File saved!");
                    });
            }
        })
    }
    else if(req.body.report == "crep"){
        let workbook = new excel.Workbook(); //creating workbook
        let worksheet = workbook.addWorksheet('Consumer');

        worksheet.columns = [
            { header: 'Consumer ID', key: 'consumer_id', width: 30 },
            { header: 'Consumer First Name', key: 'consumer_first_name', width: 30 },
            { header: 'Consumer Last Name', key: 'consumer_last_name', width: 30 },
            { header: 'Consumer Phone No.', key: 'consumer_phone_number', width: 30 },
            { header: 'Consumer Email', key: 'consumer_email', width: 30 },
            { header: 'Face Recognition', key: 'is_face_recognized', width: 30 },
            { header: 'IIFC', key: 'bank_bank_ifsc', width: 30 },
            { header: 'Credit Points', key: 'credit_points', width: 30 },
            { header: 'Account Activation', key: 'activation', width: 30 }
        ];
        db.query('SELECT consumer_id,consumer_first_name,consumer_last_name,consumer_phone_number,consumer_email,is_face_recognized,bank_bank_ifsc,credit_points,activation FROM consumer', function (error, results, fields) {
            if (error) throw error;
            else {
                const jsonTransac = JSON.parse(JSON.stringify(results));
                console.log(jsonTransac);
                worksheet.addRows(jsonTransac);
                workbook.xlsx.writeFile("c_statement.xlsx")
                    .then(function () {
                        console.log("File saved!");
                    });
            }
        })
    }
    else if (req.body.report == "prep") {
        let workbook = new excel.Workbook(); //creating workbook
        let worksheet = workbook.addWorksheet('Payee');

        worksheet.columns = [
            { header: 'Consumer ID', key: 'consumer_consumer_id', width: 30 },
            { header: 'Name', key: 'payee_name', width: 30 },
            { header: 'Nick Name', key: 'payee_nick_name', width: 30 },
            { header: 'Account Number', key: 'payee_account_number', width: 30 },
            { header: 'IFSC', key: 'bank_bank_ifsc', width: 30 }
        ];
        db.query('SELECT * FROM payee', function (error, results, fields) {
            if (error) throw error;
            else {
                const jsonTransac = JSON.parse(JSON.stringify(results));
                console.log(jsonTransac);
                worksheet.addRows(jsonTransac);
                workbook.xlsx.writeFile("py_statement.xlsx")
                    .then(function () {
                        console.log("File saved!");
                    });
            }
        })
    }
    else if (req.body.report == "arep") {
        let workbook = new excel.Workbook(); //creating workbook
        let worksheet = workbook.addWorksheet('Payee');

        worksheet.columns = [
            { header: 'Consumer ID', key: 'consumer_consumer_id', width: 30 },
            { header: 'Account Number', key: 'account_number', width: 30 },
            { header: 'Account Type', key: 'account_account_type', width: 30 },
            { header: 'Account Balance', key: 'account_balance', width: 30 }
        ];
        db.query('SELECT * FROM consumer_account', function (error, results, fields) {
            if (error) throw error;
            else {
                const jsonTransac = JSON.parse(JSON.stringify(results));
                console.log(jsonTransac);
                worksheet.addRows(jsonTransac);
                workbook.xlsx.writeFile("ca_statement.xlsx")
                    .then(function () {
                        console.log("File saved!");
                    });
            }
        })
    }
    res.redirect('/admin/reports/download/success')
})

// Admin report Success
app.get('/admin/reports/download/success', (req, res) => {
    res.render('ad_success.ejs')
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
    if (username == "root" && password == "root") {
        response.redirect('/admin')
    }
    else if (username && password) {
        db.query('SELECT consumer_id, consumer_phone_number, bank_bank_ifsc FROM consumer where consumer_id = ? and consumer_password = ?', [username, password], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                cifsc = results[0].bank_bank_ifsc
                console.log(results[0].consumer_phone_number)
                cid = results[0].consumer_id
                request.session.cpno = results[0].consumer_phone_number
                console.log(cid)
                cpho = results[0].consumer_phone_number
                const re = fast2sms.sendMessage({ authorization: process.env.API_KEY, message: generateOTP(), numbers: [parseInt(results[0].consumer_phone_number)] })
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
app.get('/otp', function (req, res) {
    res.render('otp.ejs')
})

// Verify OTP
app.post('/verify', function (req, res) {
    let otp = req.body.otp;
    var flag = 0
    db.query('SELECT otp, sent FROM otp where consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            console.log(results[0].sent)
            flag = verifyOTP(otp, results[0].otp, results[0].sent)
            if (flag) {
                req.session.loggedin = true;
                req.session.username = results[0].consumer_id;
                console.log("Success")
                res.redirect('/home/getdata');
            }
            else {
                console.log("Fail")
                res.redirect('/otp')
            }
        }

    })

})

// Dashboard
app.get('/home/getdata', function (req, res) {
    db.query('SELECT * FROM consumer_transaction where account_from_account_number in (SELECT account_number FROM consumer_account WHERE consumer_consumer_id =?)', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            posts1 = []
            console.log("Entered")
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.transaction_id = results[i].transaction_id.toString()
                d.account_to_account_number = results[i].account_to_account_number
                d.transaction_status = results[i].transaction_status
                d.transaction_amount = results[i].transaction_amount
                posts1.push(d)
            }
            console.log(posts1)
        }
        db.query('SELECT account_number FROM consumer_account WHERE consumer_consumer_id =?', [cid], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                posts = []
                for (var i = 0; i < results.length; i++) {
                    var d = {}
                    d.account_number = results[i].account_number
                    posts.push(d)
                }
                console.log(posts)
                db.query('SELECT * FROM consumer WHERE consumer_id =?', [cid], function (error, results, fields) {
                    if (error) throw error;
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

app.get('/home', function (req, res) {
    res.render("home.ejs", { articles: posts1.reverse(), art: posts, eg: posts2 })
})

// Open fund transfer home page
app.get('/home/fundtransfer', function (req, res) {
    res.render("fundtransfer_home.ejs")
})

// Open quick pay page
app.get('/home/fundtransfer/quickpay', function (req, res) {
    res.render("quickpay.ejs", { ar: posts1 })
})

// Redirect to quick pay page
app.get('/home/fundtransfer/quickpay/getdata', function (req, res) {
    db.query('SELECT * FROM consumer_account where consumer_consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            posts1 = []
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.accno = results[i].account_number
                d.balance = results[i].account_balance
                posts1.unshift(d)
            }
        }
    })
    res.redirect("/home/fundtransfer/quickpay")
})

// Transfer amount quickpay
app.post('/home/fundtransfer/quickpay/send', function (req, res) {
    var bal1, bal2;
    var today = new Date();
    var mon = today.getMonth() + 1
    if (parseInt(mon) < 10) {
        mon = "0" + mon
    }
    var day = today.getDate()
    if (parseInt(day) < 10) {
        day = "0" + day
    }
    var date = today.getFullYear() + '-' + mon + '-' + day;
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var timestamp1 = date + ' ' + time;
    t1 = timestamp1.toString()
    db.query('SELECT bank_ifsc FROM branch where bank_ifsc = ?', [req.body.pifsc], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            db.query('SELECT consumer_online_pin FROM consumer where consumer_id = ?', [cid], function (error, results, fields) {
                if (error) throw error;
                if (results.length > 0) {
                    if (results[0].consumer_online_pin == req.body.key) {
                        db.query('SELECT account_balance FROM consumer_account where consumer_consumer_id = ?', [cid], function (error, results, fields) {
                            if (error) throw error;
                            if (results.length > 0) {
                                bal1 = results[0].account_balance
                                console.log(typeof (req.body.amt))
                                console.log(bal1)
                                console.log(typeof (bal1))
                                db.query('UPDATE consumer_account SET account_balance = ? where consumer_consumer_id=?', [parseInt(bal1) - parseInt(req.body.amt), cid], function (error, results, fields) {
                                    if (error) throw error;
                                    else {
                                        console.log("Updated from payee")
                                        db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, cifsc, req.body.acc.substr(0, 10), req.body.pifsc, req.body.paccno, "IMPS", req.body.amt, "Debit", 0], function (error, results, fields) {
                                            if (error) throw error;
                                            else { console.log("Inserted debit") }
                                        })
                                    }
                                })
                            }
                            console.log(req.body.paccno)
                            db.query('SELECT account_balance FROM consumer_account where account_number = ?', [req.body.paccno], function (error, results1, fields) {
                                if (error) throw error;
                                console.log(results1.length)
                                console.log(results1)
                                if (results1.length > 0) {
                                    bal2 = results1[0].account_balance
                                    db.query('UPDATE consumer_account SET account_balance = ? where account_number = ?', [parseInt(bal2) + parseInt(req.body.amt), req.body.paccno], function (error, results, fields) {
                                        if (error) throw error;
                                        else {
                                            console.log("Updated to payee")
                                            db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, req.body.pifsc, req.body.paccno, cifsc, req.body.acc.substr(0, 10), "IMPS", req.body.amt, "Credit", 0], function (error, results, fields) {
                                                if (error) throw error;
                                                else { console.log("Inserted credit") }
                                            })
                                        }
                                    })
                                }
                            })
                        })
                    }
                    else {
                        console.log("Failed payment")
                        res.redirect('/home/fail')
                    }
                }
                else {
                    console.log("Failed payment")
                    res.redirect('/home/fail')
                }
            })
        }
        else {
            console.log("Failed payment")
            res.redirect('/home/fail')
        }
    })

    res.redirect('/home/success')
})

// Redirect to Fund transfer page
app.get('/home/fundtransfer/fund/getdata', function (req, res) {
    db.query('SELECT * FROM payee where consumer_consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            posts = []
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.title = results[i].payee_name
                d.accno = results[i].payee_account_number
                d.ifsc = results[i].bank_bank_ifsc
                posts.push(d)
            }
        }
    })
    db.query('SELECT * FROM consumer_account where consumer_consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            posts1 = []
            for (var i = 0; i < results.length; i++) {
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
app.get('/home/fundtransfer/fund', function (req, res) {
    res.render("fundtransfer.ejs", { articles: posts, ar: posts1 })
})

// Transfer amount fund
app.post('/home/fundtransfer/fund/send', function (req, res) {
    var bal1, bal2;
    var today = new Date();
    var mon = today.getMonth() + 1
    if (parseInt(mon) < 10) {
        mon = "0" + mon
    }
    var day = today.getDate()
    if (parseInt(day) < 10) {
        day = "0" + day
    }
    var date = today.getFullYear() + '-' + mon + '-' + day;
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var timestamp1 = date + ' ' + time;
    t1 = timestamp1.toString()
    db.query('SELECT consumer_online_pin FROM consumer where consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            if (results[0].consumer_online_pin == req.body.key) {
                db.query('SELECT account_balance FROM consumer_account where consumer_consumer_id = ?', [cid], function (error, results, fields) {
                    if (error) throw error;
                    if (results.length > 0) {
                        bal1 = results[0].account_balance
                        console.log(typeof (req.body.amt))
                        console.log(bal1)
                        console.log(typeof (bal1))
                        db.query('UPDATE consumer_account SET account_balance = ? where consumer_consumer_id=?', [parseInt(bal1) - parseInt(req.body.amt), cid], function (error, results, fields) {
                            if (error) throw error;
                            else {
                                console.log("Updated from payee")
                                db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, cifsc, req.body.acc.substr(0, 10), req.body.payee.substr(10,), req.body.payee.substr(0, 10), "IMPS", req.body.amt, "Debit", 0], function (error, results, fields) {
                                    if (error) throw error;
                                    else { console.log("Inserted debit") }
                                })
                            }
                        })
                    }
                    console.log(req.body.payee.substr(0, 10))
                    db.query('SELECT account_balance FROM consumer_account where account_number = ?', [req.body.payee.substr(0, 10)], function (error, results1, fields) {
                        if (error) throw error;
                        console.log(results1.length)
                        console.log(results1)
                        if (results1.length > 0) {
                            bal2 = results1[0].account_balance
                            db.query('UPDATE consumer_account SET account_balance = ? where account_number = ?', [parseInt(bal2) + parseInt(req.body.amt), req.body.payee.substr(0, 10)], function (error, results, fields) {
                                if (error) throw error;
                                else {
                                    console.log("Updated to payee")
                                    db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, req.body.payee.substr(10,), req.body.payee.substr(0, 10), cifsc, req.body.acc.substr(0, 10), "IMPS", req.body.amt, "Credit", 0], function (error, results, fields) {
                                        if (error) throw error;
                                        else { console.log("Inserted credit") }
                                    })
                                }
                            })
                        }
                    })
                })
            }
        }
        else {
            console.log("Failed payment")
        }
    })
    res.redirect('/home/success')
})

// Open online pin page - Recent
app.post('/home/fundtransfer/recent/getdata', function (req, res) {
    const tid = req.body.pay
    var d = {}
    posts = []
    db.query('SELECT * FROM consumer_transaction where transaction_id = ?', [tid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            d.amt = parseInt(results[0].transaction_amount)
            d.faccno = results[0].account_from_account_number
            d.taccno = results[0].account_to_account_number
            d.tifsc = results[0].bank_to_ifsc
        }
        db.query('SELECT * FROM consumer_account where account_number = ?', [d.faccno], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                d.bal = results[0].account_balance
                posts.push(d)
            }
        })
    })
    res.redirect('/home/fundtransfer/recent')
})

app.get('/home/fundtransfer/recent', function (req, res) {
    res.render('recent_trans.ejs', { articles: posts })
})

// Transfer amount recent
app.post('/home/fundtransfer/recent/send', function (req, res) {
    var bal1, bal2;
    var today = new Date();
    var mon = today.getMonth() + 1
    if (parseInt(mon) < 10) {
        mon = "0" + mon
    }
    var day = today.getDate()
    if (parseInt(day) < 10) {
        day = "0" + day
    }
    var date = today.getFullYear() + '-' + mon + '-' + day;
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var timestamp1 = date + ' ' + time;
    t1 = timestamp1.toString()
    console.log(req.body)
    db.query('SELECT consumer_online_pin FROM consumer where consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            if (results[0].consumer_online_pin == req.body.key) {
                db.query('SELECT account_balance FROM consumer_account where consumer_consumer_id = ?', [cid], function (error, results, fields) {
                    if (error) throw error;
                    if (results.length > 0) {
                        bal1 = results[0].account_balance
                        db.query('UPDATE consumer_account SET account_balance = ? where consumer_consumer_id=?', [parseInt(bal1) - parseInt(posts[0].amt), cid], function (error, results, fields) {
                            if (error) throw error;
                            else {
                                console.log("Updated from payee")
                                db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, cifsc, posts[0].faccno, posts[0].tifsc, posts[0].taccno, "IMPS", posts[0].amt, "Debit", 0], function (error, results, fields) {
                                    if (error) throw error;
                                    else { console.log("Inserted debit") }
                                })
                            }
                        })
                    }
                    db.query('SELECT account_balance FROM consumer_account where account_number = ?', [posts[0].taccno], function (error, results1, fields) {
                        if (error) throw error;
                        console.log(results1.length)
                        console.log(results1)
                        if (results1.length > 0) {
                            bal2 = results1[0].account_balance
                            db.query('UPDATE consumer_account SET account_balance = ? where account_number = ?', [parseInt(bal2) + parseInt(posts[0].amt), posts[0].taccno], function (error, results, fields) {
                                if (error) throw error;
                                else {
                                    console.log("Updated to payee")
                                    db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, posts[0].tifsc, posts[0].taccno, cifsc, posts[0].faccno, "IMPS", posts[0].amt, "Credit", 0], function (error, results, fields) {
                                        if (error) throw error;
                                        else { console.log("Inserted credit") }
                                    })
                                }
                            })
                        }
                    })
                })
            }
        }
        else {
            console.log("Failed payment")
            res.redirect('/home/getdata')
        }
    })
    res.redirect('/home/success')
})

// Favourite page
app.get('/home/fundtransfer/favourite/getdata', function (req, res) {
    db.query('SELECT * FROM favourites where consumer_consumer_id =?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            posts1 = []
            console.log("Entered fav")
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.fav_id = results[i].fav_id.toString()
                d.account_to_account_number = results[i].account_to_account_number
                d.payee_nick_name = results[i].payee_nick_name
                d.transaction_amount = results[i].transaction_amount
                posts1.push(d)
            }
            console.log(posts1)
        }
    })
    res.redirect("/home/fundtransfer/favourite")
})

// Favourites page
app.get('/home/fundtransfer/favourite', function (req, res) {
    res.render('favourites.ejs', { articles: posts1 })
})

var fav_id
app.post('/home/funtransfer/favourite/deladd', function (req, res) {
    if (req.body.pay) {
        fav_id = req.body.pay
        res.redirect('/home/fundtransfer/favourite/pay/getdata')
    }
    else if (req.body.delete) {
        fav_id = req.body.delete
        res.redirect('/home/fundtransfer/favourite/delete')
    }
})

// Open Add fav page
app.get('/home/fundtransfer/favourite/addfav/getdata', function (req, res) {
    db.query('SELECT payee_account_number FROM payee WHERE consumer_consumer_id =?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            posts = []
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.payee_account_number = results[i].payee_account_number
                posts.push(d)
            }
            console.log(posts)
        }
    })
    db.query('SELECT account_number FROM consumer_account WHERE consumer_consumer_id =?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            posts1 = []
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.account_number = results[i].account_number
                posts1.push(d)
            }
            console.log(posts1)
        }
    })
    res.redirect('/home/fundtransfer/favourite/addfav')
})

// Open Add fav page
app.get('/home/fundtransfer/favourite/addfav', function (req, res) {
    res.render("add_fav.ejs", { art: posts, articles: posts1 })
})

// Add fav payee
app.post('/home/fundtransfer/favourite/addfav/add', function (req, res) {
    var account_to_account_number = req.body.account_to_account_number
    var account_from_account_number = req.body.account_from_account_number
    var transaction_amount = parseInt(req.body.transaction_amount)
    var res1, res2
    console.log(account_to_account_number, account_from_account_number, transaction_amount)
    db.query('SELECT * FROM payee where payee_account_number=?', [account_to_account_number], function (error, results, fields) {
        res1 = results
        console.log(res1)
        if (error) throw error;
        else {
            db.query('SELECT * FROM consumer where consumer_id=?', [cid], function (error, results, fields) {
                res2 = results
                console.log(res2)
                if (error) throw error;
                else {
                    db.query('INSERT INTO favourites(consumer_consumer_id, payee_name, payee_nick_name, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?);', [cid, res1[0].payee_name, res1[0].payee_nick_name, res2[0].bank_bank_ifsc, account_from_account_number, res1[0].bank_bank_ifsc, account_to_account_number, transaction_amount], function (error, results, fields) {
                        if (error) throw error;
                        else {
                            console.log("Inserted payee details")
                            res.redirect("/home/success")
                        }
                    })
                }
            })
        }
    })
})

// Delete favourites
app.get('/home/fundtransfer/favourite/delete', function (req, res) {
    db.query('DELETE FROM favourites where fav_id=?', [fav_id], function (error, results, fields) {
        if (error) throw error;
        else {
            console.log("Deleted requested fav")
            res.redirect("/home/success")
        }
    })
})

// Open online pin page - Favourite
app.get('/home/fundtransfer/favourite/pay/getdata', function (req, res) {
    fid = parseInt(fav_id)
    console.log(fid)
    var d = {}
    posts = []
    db.query('SELECT * FROM favourites where fav_id = ?', [fid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            d.amt = parseInt(results[0].transaction_amount)
            d.faccno = results[0].account_from_account_number
            d.taccno = results[0].account_to_account_number
            d.tifsc = results[0].bank_to_ifsc
        }
        db.query('SELECT * FROM consumer_account where account_number = ?', [d.faccno], function (error, results, fields) {
            if (error) throw error;
            if (results.length > 0) {
                d.bal = results[0].account_balance
                posts.push(d)
            }
        })
    })
    res.redirect('/home/fundtransfer/favourite/pay')
})

app.get('/home/fundtransfer/favourite/pay', function (req, res) {
    res.render('fav_trans.ejs', { articles: posts })
})

// Transfer amount favourite
app.post('/home/fundtransfer/favourite/send', function (req, res) {
    var bal1, bal2;
    var today = new Date();
    var mon = today.getMonth() + 1
    if (parseInt(mon) < 10) {
        mon = "0" + mon
    }
    var day = today.getDate()
    if (parseInt(day) < 10) {
        day = "0" + day
    }
    var date = today.getFullYear() + '-' + mon + '-' + day;
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var timestamp1 = date + ' ' + time;
    t1 = timestamp1.toString()
    console.log(req.body)
    db.query('SELECT consumer_online_pin FROM consumer where consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            if (results[0].consumer_online_pin == req.body.key) {
                db.query('SELECT account_balance FROM consumer_account where consumer_consumer_id = ?', [cid], function (error, results, fields) {
                    if (error) throw error;
                    if (results.length > 0) {
                        bal1 = results[0].account_balance
                        db.query('UPDATE consumer_account SET account_balance = ? where consumer_consumer_id=?', [parseInt(bal1) - parseInt(posts[0].amt), cid], function (error, results, fields) {
                            if (error) throw error;
                            else {
                                console.log("Updated from payee")
                                db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, cifsc, posts[0].faccno, posts[0].tifsc, posts[0].taccno, "IMPS", posts[0].amt, "Debit", 0], function (error, results, fields) {
                                    if (error) throw error;
                                    else { console.log("Inserted debit") }
                                })
                            }
                        })
                    }
                    db.query('SELECT account_balance FROM consumer_account where account_number = ?', [posts[0].taccno], function (error, results1, fields) {
                        if (error) throw error;
                        console.log(results1.length)
                        console.log(results1)
                        if (results1.length > 0) {
                            bal2 = results1[0].account_balance
                            db.query('UPDATE consumer_account SET account_balance = ? where account_number = ?', [parseInt(bal2) + parseInt(posts[0].amt), posts[0].taccno], function (error, results, fields) {
                                if (error) throw error;
                                else {
                                    console.log("Updated to payee")
                                    db.query('INSERT INTO consumer_transaction (transaction_time, bank_from_ifsc, account_from_account_number, bank_to_ifsc, account_to_account_number, transaction_transaction_method, transaction_amount, transaction_status, transaction_charge) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [t1, posts[0].tifsc, posts[0].taccno, cifsc, posts[0].faccno, "IMPS", posts[0].amt, "Credit", 0], function (error, results, fields) {
                                        if (error) throw error;
                                        else { console.log("Inserted credit") }
                                    })
                                }
                            })
                        }
                    })
                })
            }
        }
        else {
            console.log("Failed payment")
            res.redirect('/home/getdata')
        }
    })
    res.redirect('/home/success')
})

// Open Manage page
app.get('/home/managepayee', function (req, res) {
    res.render("managepayee.ejs")
})

// Open Success page
app.get('/home/success', function (req, res) {
    res.render("success.ejs")
})

// Open Veiw Payee page
app.get('/home/managepayee/viewpayee/getdata', function (req, res) {
    db.query('SELECT * FROM payee where consumer_consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            p = []
            for (var i = 0; i < results.length; i++) {
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

app.get('/home/managepayee/viewpayee', function (req, res) {
    res.render("viewpayee.ejs", { articles: p })
})

// Open Update payee page
app.get('/home/managepayee/updatepayee/getdata', function (req, res) {
    db.query('SELECT * FROM payee where consumer_consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            p = []
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.accno = results[i].payee_account_number
                p.push(d)
            }
        }
    })
    res.redirect("/home/managepayee/updatepayee")
})

app.get('/home/managepayee/updatepayee', function (req, res) {
    res.render("updatepayee.ejs", { articles: p })
})

app.post('/home/managepayee/updatepayee/send', function (req, res) {
    acc = req.body.acc
    pname = req.body.name
    const re = fast2sms.sendMessage({ authorization: process.env.API_KEY, message: generateOTP(), numbers: [parseInt(cpho)] })
    res.redirect('/home/managepayee/updatepayee/verify')
})

// Open OTP page
app.get('/home/managepayee/updatepayee/verify', function (req, res) {
    res.render("updatepayee_otp.ejs")
})

// Verify OTP in add payee
app.post('/home/managepayee/updatepayee/verify', function (req, res) {
    var otp = req.body.otp
    db.query('SELECT otp, sent FROM otp where consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            console.log(results[0].sent)
            flag = verifyOTP(otp, results[0].otp, results[0].sent)
            console.log(cid)
            if (flag) {
                console.log("Success")
                db.query('UPDATE payee SET payee_name = ? where consumer_consumer_id=? and payee_account_number = ?', [pname, cid, acc], function (error, results, fields) {
                    if (error) throw error;
                    else {
                        console.log("Updated name")
                        res.redirect('/home/success')
                    }
                })
            }
            else {
                console.log("Fail Deletion")
                res.redirect('/home/managepayee')
            }
        }
    })
})

// Open Delete payee page
app.get('/home/managepayee/deletepayee/getdata', function (req, res) {
    db.query('SELECT * FROM payee where consumer_consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            p = []
            for (var i = 0; i < results.length; i++) {
                var d = {}
                d.accno = results[i].payee_account_number
                p.push(d)
            }
        }
    })
    res.redirect("/home/managepayee/deletepayee")
})

app.get('/home/managepayee/deletepayee', function (req, res) {
    res.render("deletepayee.ejs", { articles: p })
})

app.post('/home/managepayee/deletepayee/send', function (req, res) {
    acc = req.body.acc
    const re = fast2sms.sendMessage({ authorization: process.env.API_KEY, message: generateOTP(), numbers: [parseInt(cpho)] })
    res.redirect('/home/managepayee/deletepayee/verify')
})

// Open OTP page
app.get('/home/managepayee/deletepayee/verify', function (req, res) {
    res.render("deletepayee_otp.ejs")
})

// Verify OTP in add payee
app.post('/home/managepayee/deletepayee/verify', function (req, res) {
    var otp = req.body.otp
    db.query('SELECT otp, sent FROM otp where consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            console.log(results[0].sent)
            flag = verifyOTP(otp, results[0].otp, results[0].sent)
            console.log(cid)
            if (flag) {
                console.log("Success")
                db.query('DELETE FROM payee where consumer_consumer_id=? and payee_account_number = ?', [cid, acc], function (error, results, fields) {
                    if (error) throw error;
                    else {
                        console.log("Deleted name")
                        res.redirect("/home/success")
                    }
                })
            }
            else {
                console.log("Fail Deletion")
                res.redirect('/home/managepayee')
            }
        }
    })
})

// Open Add Payee page
app.get('/home/managepayee/addpayee', function (req, res) {
    res.render("addpayee.ejs")
})

// Open OTP page
app.get('/home/managepayee/addpayee/verify', function (req, res) {
    res.render("addpayee_otp.ejs")
})

// OTP send in add payee
var paccn, pname, pifsc, paccno
app.post('/home/managepayee/addpayee/add', function (req, res) {
    paccn = req.body.paccn
    pname = req.body.pname
    pifsc = req.body.pifsc
    paccno = req.body.paccno
    const re = fast2sms.sendMessage({ authorization: process.env.API_KEY, message: generateOTP(), numbers: [parseInt(cpho)] })
    res.redirect('/home/managepayee/addpayee/verify')
})

// Verify OTP in add payee
app.post('/home/managepayee/addpayee/verify', function (req, res) {
    var otp = req.body.otp
    db.query('SELECT otp, sent FROM otp where consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            console.log(results[0].sent)
            flag = verifyOTP(otp, results[0].otp, results[0].sent)
            console.log(cid)
            if (flag) {
                console.log("Success")
                db.query('INSERT INTO payee (consumer_consumer_id, payee_name, payee_nick_name, payee_account_number, bank_bank_ifsc) VALUES (?, ?, ?, ?, ?)', [cid, paccn, pname, paccno, pifsc], function (error, results, fields) {
                    if (error) throw error;
                    else {
                        console.log("Inserted payee details")
                        res.redirect("/home/success")
                    }
                })
            }
            else {
                console.log("Fail")
                res.redirect('/home/managepayee')
            }
        }
    })
})

// Get data for E-Statement
app.get('/home/estatement/getdata', function (req, res) {
    db.query('SELECT * FROM consumer_account where consumer_consumer_id = ?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            posts1 = []
            for (var i = 0; i < results.length; i++) {
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
app.get('/home/estatement', function (req, res) {
    res.render("estatement.ejs", { articles: posts1 })
})

app.post('/home/estatement/download', function (req, res) {
    let workbook = new excel.Workbook(); //creating workbook
    let worksheet = workbook.addWorksheet('Transactions');

    worksheet.columns = [
        { header: 'Transaction ID', key: 'transaction_id', width: 30 },
        { header: 'Transaction Time', key: 'transaction_time', width: 30 },
        { header: 'IFSC', key: 'bank_from_ifsc', width: 30 },
        { header: 'Account Number', key: 'account_from_account_number', width: 30 },
        { header: 'Other Account IFSC', key: 'bank_to_ifsc', width: 30 },
        { header: 'Other Account Number', key: 'account_to_account_number', width: 30 },
        { header: 'Transaction Method', key: 'transaction_transaction_method', width: 30 },
        { header: 'Transaction Amount', key: 'transaction_amount', width: 30 },
        { header: 'Transaction Status', key: 'transaction_status', width: 30 },
        { header: 'Transaction Charge', key: 'transaction_charge', width: 30 }
    ];
    if (req.body.etype == "all") {
        db.query('SELECT * FROM consumer_transaction where account_from_account_number = ?', [req.body.acc], function (error, results, fields) {
            if (error) throw error;
            else {
                const jsonTransac = JSON.parse(JSON.stringify(results));
                console.log(jsonTransac);
                worksheet.addRows(jsonTransac);
                workbook.xlsx.writeFile("e-statement.xlsx")
                    .then(function () {
                        console.log("File saved!");
                    });
            }
        })
    }
    else if (req.body.etype == "month") {
        var st = req.body.edurmon
        if (st.length != 7) {
            res.redirect('/home/invalid')
        }
        db.query('SELECT * FROM consumer_transaction where account_from_account_number = ? AND SUBSTR(transaction_time, 1,7)=?', [req.body.acc, st], function (error, results, fields) {
            if (error) throw error;
            else {
                const jsonTransac = JSON.parse(JSON.stringify(results));
                console.log(jsonTransac);
                worksheet.addRows(jsonTransac);
                workbook.xlsx.writeFile("e-statement.xlsx")
                    .then(function () {
                        console.log("File saved!");
                    });
            }
        })
    }
    else if (req.body.etype == "year") {
        var st = req.body.eduryr
        if (st.length != 4) {
            res.redirect('/home/invalid')
        }
        db.query('SELECT * FROM consumer_transaction where account_from_account_number = ? AND SUBSTR(transaction_time, 1,4)=?', [req.body.acc, st], function (error, results, fields) {
            if (error) throw error;
            else {
                const jsonTransac = JSON.parse(JSON.stringify(results));
                console.log(jsonTransac);
                worksheet.addRows(jsonTransac);

                workbook.xlsx.writeFile("e-statement.xlsx")
                    .then(function () {
                        console.log("File saved!");
                    });
            }
        })
    }
    else {
        res.redirect('/home/invalid')
    }
    res.redirect("/home/success")
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
    db.query('SELECT * FROM otp where consumer_id=?', [cid], function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            db.query('UPDATE otp SET otp = ?, sent =? where consumer_id=?', [OTP, timestamp1.toString(), cid], function (error, results, fields) {
                if (error) throw error;
                else { console.log("Updated") }
            })
        }
        else {
            db.query('INSERT INTO otp (consumer_id, otp, sent) VALUES (?,?,?)', [cid, OTP, timestamp1.toString()], function (error, results, fields) {
                if (error) throw error;
                else { console.log("Inserted") }
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

function verifyOTP(otp, otp1, t1) {
    console.log(otp)
    console.log(parseInt(t1))
    var ts2 = new Date().getTime();
    t2 = parseInt(ts2.toString())
    console.log(t2)
    tdm = timeDifference(t1, t2)
    if (tdm < 3 && otp1 == otp) {
        return true
    }
}
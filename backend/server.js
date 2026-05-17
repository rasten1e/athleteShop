const express = require("express");
const fs = require("fs");
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "..", "Images", "Products");
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const randomName = Math.round(Math.random() * 1000000000);
        cb(null, randomName + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
const storageAvatar = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "..", "Images", "UserImages");
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const randomName = Math.round(Math.random() * 1000000000);
        cb(null, randomName + path.extname(file.originalname));
    }
});
const uploadAvatar = multer({ storage: storageAvatar });
const sqlite3 = require("sqlite3");
const cors = require("cors");
const path = require("path");
const {json} = require("express");
const bcrypt = require("bcrypt");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, ".."), {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(jpg|jpeg|png|webp|gif|svg)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
    }
}));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

const dbPath = path.resolve(__dirname, "../database.db");
const db = new sqlite3.Database(dbPath);

db.run("PRAGMA foreign_keys = ON;");
db.get("SELECT 1", (err)=> {
    if (err){
        console.error("Ошибка подключения БД - ",err.message);
    }
    else{
        console.log("Подключение к БД установлено")
    }
});

app.post("/api/login", (req, res)=> {
    const {login, password} = req.body;

    db.get("SELECT * FROM users WHERE login = ?", [login], (err, user) => {
            if (err){
                console.error("Ошибка: ", err);
                return res.status(500).json({ success: false, message: "Ошибка сервера"});
            }
            if (!user){
                return res.json({success: false, message: "Неверный логин или пароль"});
            }
            else {
                const checkHashPass = bcrypt.compareSync(password, user.password);
                if(checkHashPass){
                    return res.json({success: true, message: "Вход выполнен", login: user.login, role: user.idRole});
                }
                else{
                    return res.json({success: false, message: "Неверный логин или пароль"});
                }

            }
        }
    );
});

app.post("/api/register", (req, res)=> {
    const {FIO, phone, login, password} = req.body;
    if(!FIO || !phone || !login || !password){
        return res.json({success: false, message: "Заполните все поля"});
    }
    if(login.length > 24){
        return res.json({success: false, message: "Логин должен быть до 24 символов"});
    }
    const passwordHash = bcrypt.hashSync(password, 10);

    db.get("SELECT * FROM users WHERE login = ? OR phone = ?", [login, phone], (err, existUser) => {
        if (err) {
            return res.status(500).json({success: false, message: "Ошибка сервера"});
        }
        if (existUser){
            if (existUser.login === login){
                return res.json({success: false, message: "Такой логин уже занят"});
            }
            if (existUser.phone === phone && existUser.idRole !== 2) {
                return res.json({success: false, message: "Такой телефон уже зарегистрирован"});
            }
        }
        db.run(
            "INSERT INTO users (login, password, idRole, FIO, phone) VALUES (?,?,1,?,?)",
            [login, passwordHash, FIO, phone],
            (err) => {
                if (err) {
                    console.log("Ошибка БД: " + err.message);
                    return res.status(500).json({success: false, message: "Ошибка при сохранении"});
                }
                else{
                    console.log("Зарегистрирован новый пользователь: " + login);
                    return res.json({success: true, message: "Регистрация прошла успешно. Войдите в профиль"});
                }
            }
        );
    });
});

app.post("/api/loadInfToProfile", (req, res)=> {
    const {login} = req.body;
    if(!login){
        return res.json({success: false, message: "Пользователь не авторизован"});
    }
    db.get("SELECT FIO, phone, login, avatar FROM users WHERE login = ?", [login], (err, user) => {
        if (err){
            return res.status(500).json({success: false, message: "Ошибка сервера"});
        }
        if (!user){
            return res.json({success: false, message: "Пользователь не найден"});
        }
        else {
            return res.json({success: true, data: user});
        }
    });
});

app.post("/api/changeFIO", (req, res)=> {
    const {FIO, login} = req.body;
    if(!FIO){
        return res.json({success: false, message: "Заполните ФИО"});
    }
    db.run("UPDATE users SET FIO = ? WHERE login = ?", [FIO, login], (err) => {
        if(err){
            console.log(err.message);
            return res.status(500).json({success: false, message: "Ошибка сервера"});
        }
        else{
            return res.json({success: true, message: "ФИО изменено"});
        }
    });
});

app.post("/api/changePhone", (req, res)=> {
    const {phone, login} = req.body;
    db.get("SELECT * FROM users WHERE phone = ?", [phone], (err, existPhone) => {
        if (err) return res.status(500).json({success: false, message: "Ошибка сервера"});
        if (existPhone){
            return res.json({success: false, message: "Такой телефон уже занят"});
        }
        else {
            db.run("UPDATE users SET phone = ? WHERE login = ?", [phone, login], (err) => {
                if(err) return res.status(500).json({success: false, message: "Ошибка сервера"});
                else{
                    return res.json({success: true, message: "Телефон изменен"});
                }
            });
        }
    });
});

app.post("/api/changeLogin", (req, res)=> {
    const {newLogin, login} = req.body;
    if(newLogin.length > 24){
        return res.json({success: false, message: "Логин должен быть до 24 символов"});
    }
    console.log("Смена логина: old= "+login, ", new= "+newLogin);
    db.get("SELECT * FROM users WHERE login = ?", [newLogin], (err, existLogin)=> {
        if (err) return res.status(500).json({success: false, message: "Ошибка сервера"});
        if (existLogin){
            return res.json({success: false, message: "Такой логин уже занят"});
        }
        else {
            db.run("UPDATE users SET login = ? WHERE login = ?", [newLogin, login], (err)=> {
                if(err) return res.status(500).json({success: false, message: "Ошибка сервера"});
                else{
                    return res.json({success: true, message: "Логин изменен", newLogin: newLogin});
                }
            });
        }
    });
});

app.post("/api/changePassword", (req, res)=> {
    const {newPassword, oldPassword, login} = req.body;
    console.log("Попытка смены пароля для: "+login);
    console.log("oldPassword: "+ oldPassword);
    console.log("newPassword: "+ newPassword);
    console.log("login: "+ login);
    if(!newPassword || !oldPassword){
        return res.json({success: false, message: "Заполните все поля"});
    }
    if(!/[A-ZА-Я]/.test(newPassword)){
        return res.json({success: false, message: "Новый пароль должен содержать хотя бы одну ЗАГЛАВНУЮ букву"});
    }
    if(!/[0-9]/.test(newPassword)){
        return res.json({success: false, message: "Новый пароль должен содержать хотя бы одну цифру"});
    }
    db.get("SELECT * FROM users WHERE login = ?", [login], (err, user)=> {
        if(err) return res.status(500).json({success: false, message: "Ошибка сервера"});
        if(!user){
            return res.json({success: false, message: "Пользователь не найден"});
        }
        else {
            const passCompare = bcrypt.compareSync(oldPassword, user.password);
            if(!passCompare){
                return res.json({success: false, message: "Неверный старый пароль"});
            }
            const newHashPass = bcrypt.hashSync(newPassword, 10);
            db.run("UPDATE users SET password = ? WHERE login = ?", [newHashPass, login], (err)=> {
                if(err){
                    return res.status(500).json({success: false, message: "Ошибка сервера"});
                }
                else{
                    return res.json({success: true, message: "Пароль изменен"});
                }
            });
        }
    });
});

app.post("/api/uploadAvatar", uploadAvatar.single("avatar"), (req, res) => {
    const { login } = req.body;
    if (!req.file) {
        return res.json({ success: false, message: "Файл не загружен" });
    }
    db.get("SELECT avatar FROM users WHERE login = ?", [login], (err, user) => {
        let oldAvatar = null;
        if(user){
            oldAvatar = user.avatar;
        }
        const avatarPath = "Images/UserImages/" + req.file.filename;
        db.run("UPDATE users SET avatar = ? WHERE login = ?", [avatarPath, login], function(err) {
            if (err) {
                console.error("Ошибка обновления:"+err.message);
                return res.json({ success: false, message: "Ошибка сервера" });
            }
            if (oldAvatar && oldAvatar !== "Images/UserImages/defaultAvatar.png") {
                const oldFullPath = path.join(__dirname, "..", oldAvatar);
                if (fs.existsSync(oldFullPath)) {
                    fs.unlinkSync(oldFullPath);
                }
            }
            return res.json({success: true, message: "Аватар успешно загружен", avatar: avatarPath});
        });
    });
});

app.get("/api/products", (req, res)=> {
    db.all("SELECT idProduct as id, name, price, images, idCategory, sizes, description FROM products", [], (err, products)=> {
        if(err){
            console.error("ОШИБКА БД:"+err.message);
            return res.status(500).json({success: false, message: "Ошибка сервера"});
        }
        if(!products){
            return res.json({success: true, products:[] });
        }
        else{
            return res.json({success: true, products});
        }
    });
});

app.post("/api/addProduct", upload.array("photos", 5), (req, res)=> {
    const { name, price, description, category, sizes} = req.body;
    let imagePaths = [];
    if(req.files && req.files.length > 0){
        for(let i=0; i < req.files.length; i++){
            const filePath = "Images/Products/" + req.files[i].filename;
            imagePaths.push(filePath);
        }
    }
    const imageJson = JSON.stringify(imagePaths);
    if (!db) {
        return res.status(500).json({ success: false, message: "База данных не подключена" });
    }
    db.run("INSERT INTO products (name, price, description, idCategory, images, sizes) VALUES (?,?,?,?,?,?)",[name, price, description, category, imageJson, sizes], (err)=> {
        if(err){
            console.error("Ошибка добавления: ",err);
            return res.status(500).json({success: false, message: "Ошибка сервера"});
        }
        else{
            return res.json({success: true, message: "Товар успешно добавлен"});
        }
    });
});

app.post("/api/editProduct", upload.array("photos", 5), (req, res)=> {
    const {productId, name, price, description, category, sizes} = req.body;
    let imagePaths = [];
    if(req.files && req.files.length > 0){
        req.files.forEach((file)=>{
            imagePaths.push("Images/Products/" + file.filename);
        });
    }
    let imageJson = null;
    if(imagePaths.length > 0){
        imageJson = JSON.stringify(imagePaths);
    }
    let sql = "UPDATE products set name = ?, price = ?, description = ?, idCategory = ?, sizes = ?";
    const params = [name, price, description, category, sizes];
    if(imageJson !== null){
        sql += ", images = ?";
        params.push(imageJson);
    }
    sql += "WHERE idProduct = ?";
    params.push(productId);
    db.run(sql, params, function (err) {
        if(err){
            console.error("Ошибка обновления: "+err);
            return res.status(500).json({success: false, message: "Ошибка сервера"});
        }
        if(this.changes === 0){
            return res.json({success: false, message: "Товар не найден"});
        }
        else{
            console.log("ID обновленного товара: "+productId);
            return res.json({success: true, message: "Товар успешно изменен"});
        }
    });
});

app.delete("/api/products/:id", (req, res) => {
    const productId = req.params.id;
    db.run("DELETE FROM orderItems WHERE idProduct = ?", [productId], () => {
        db.run("DELETE FROM reviews WHERE idProduct = ?", [productId], () => {
            db.get("SELECT images FROM products WHERE idProduct = ?", [productId], (err, product) => {
                if (!product) {
                    return res.json({ success: false, message: "Товар не найден" });
                }
                if (product.images) {
                    try {
                        const images = JSON.parse(product.images);
                        images.forEach(imgPath => {
                            const fullPath = path.join(__dirname, "..", imgPath);
                            if (fs.existsSync(fullPath)) {
                                fs.unlinkSync(fullPath);
                            }
                        });
                    } catch(e) {}
                }
                db.run("DELETE FROM products WHERE idProduct = ?", [productId], function(err) {
                    if (err) {
                        return res.json({ success: false, message: "Ошибка" });
                    }
                    res.json({ success: true, message: "Товар удалён" });
                });
            });

        });
    });
});

app.post("/api/newOrder", (req, res) => {
    const { login, basket } = req.body;
    if (!login || !basket || basket.length === 0) {
        return res.json({ success: false, message: "Корзина пуста" });
    }
    db.get("SELECT idUser FROM users WHERE login = ?", [login], (err, user) => {
        if (err || !user) {
            return res.json({ success: false, message: "Пользователь не найден" });
        }
        const userId = user.idUser;
        let totalAmount = 0;
        for (let i = 0; i < basket.length; i++) {
            totalAmount += basket[i].price * basket[i].quantity;
        }
        db.run(
            "INSERT INTO orders (idUser, status, totalAmount) VALUES (?, 'принят', ?)",
            [userId, totalAmount],
            function (err) {
                if (err) {
                    console.error("Ошибка создания заказа:" + err.message);
                    return res.json({ success: false, message: "Ошибка сервера" });
                }
                const orderId = this.lastID;
                let savedCount = 0;
                basket.forEach(item => {
                    db.run(
                        `INSERT INTO orderItems (idOrder, idProduct, name, price, size, image, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [orderId, item.id, item.name, item.price, item.size, item.image, item.quantity],
                        (err) => {
                            if (err) {
                                console.error("Ошибка сохранения товара:", err.message);
                                return res.json({ success: false, message: "Ошибка при сохранении товара" });
                            }
                            savedCount++;
                            if (savedCount === basket.length) {
                                return res.json({ success: true, message: "Заказ оформлен, с вами в ближайшее время свяжется наш сотрудник, для отслеживания заказа перейдите в свой профиль", orderId: orderId });
                            }
                        }
                    );
                });
            }
        );
    });
});

app.get("/api/loadOrders/user", (req, res) => {
    const login = req.query.login;
    if(!login){
        return res.json({success: false, message: "Логин не указан"});
    }
    db.get("SELECT idUser FROM users WHERE login = ?", [login], (err, user) => {
        if (err || !user) {
            return res.json({ success: false, message: "Пользователь не найден" });
        }
        db.all("SELECT orders.*, (SELECT FIO FROM users where idUser = orders.idUser) as userFIO, (SELECT phone FROM users WHERE idUser = orders.idUser) as userPhone FROM orders WHERE orders.idUser = ? ORDER BY createdAt DESC", [user.idUser], (err, orders) => {
            if (err) {
                return res.json({ success: false, message: "Ошибка БД" });
            }
            else{
                return res.json({ success: true, orders });
            }
        });
    });
});

app.get("/api/loadOrders/admin", (req, res) => {
    db.all("SELECT orders.*, (SELECT FIO FROM users where idUser = orders.idUser) as userFIO, (SELECT phone FROM users WHERE idUser = orders.idUser) as userPhone FROM orders ORDER BY createdAt DESC",  (err, orders) => {
        if (err) {
            return res.json({ success: false, message: "Ошибка БД" });
        }
        else{
            return res.json({ success: true, orders });
        }
    });
});

app.delete("/api/orders/:id", (req, res) => {
    const orderId = req.params.id;
    const login = req.body.login;
    if (!login) {
        return res.json({ success: false, message: "Не указан логин" });
    }
    db.run("DELETE FROM orders WHERE idOrder = ?", [orderId], function(err) {
        if (err) {
            return res.json({ success: false, message: "Ошибка удаления" });
        }
        if (this.changes === 0) {
            return res.json({ success: false, message: "Заказ не найден" });
        }
        else {
            return res.json({ success: true, message: "Заказ удалён" });
        }
    });
});

app.get("/api/orders/:id/items", (req, res) => {
    const orderId = req.params.id;
    db.all(
        `SELECT * FROM orderItems WHERE idOrder = ?`,
        [orderId],
        (err, items) => {
            if (err) {
                console.error("Ошибка загрузки товаров:"+err.message);
                return res.json({ success: false, message: "Ошибка БД" });
            }
            else{
                return res.json({ success: true, items });
            }
        }
    );
});

app.post("/api/orders/:id/status", (req, res) => {
    const orderId = req.params.id;
    const { login, status } = req.body;
    db.get("SELECT idRole FROM users WHERE login = ?", [login], (err, user) => {
        if (err || !user || user.idRole !== 2) {
            return res.json({ success: false, message: "Доступ запрещён" });
        }
        db.run("UPDATE orders SET status = ? WHERE idOrder = ?", [status, orderId], function(err) {
            if (err) {
                console.error("Ошибка обновления статуса:"+err.message);
                return res.json({ success: false, message: "Ошибка сервера" });
            }
            if (this.changes === 0) {
                return res.json({ success: false, message: "Заказ не найден" });
            }
            else {
                return res.json({ success: true, message: "Статус обновлён" });
            }
        });
    });
});

app.post("/api/reviews", (req, res) => {
    const { login, productId, rating, comment } = req.body;
    db.get("SELECT idRole, idUser FROM users WHERE login = ?", [login], (err, user) => {
        if (err || !user) {
            return res.json({ success: false, message: "Ошибка пользователя" });
        }
        if(user.idRole === 2){
            return res.json({ success: false, message: "Администраторы не могут оставлять отзывы" });
        }
        db.get(
            "SELECT idReview FROM reviews WHERE idUser = ? AND idProduct = ?", [user.idUser, productId], (err, existing) => {
                if (existing) {
                    return res.json({ success: false, message: "Вы уже оставили отзыв на этот товар" });
                }
                db.run(
                    "INSERT INTO reviews (idProduct, idUser, rating, comment) VALUES (?, ?, ?, ?)", [productId, user.idUser, rating, comment || ""], (err)=> {
                        if (err) {
                            console.error(err.message);
                            return res.json({ success: false, message: "Ошибка БД" });
                        }
                        else {
                            return res.json({ success: true, message: "Спасибо за отзыв!" });
                        }
                    }
                );
            }
        );
    });
});

app.get("/api/products/:id/reviews", (req, res) => {
    const productId = req.params.id;
    db.get("SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE idProduct = ?", [productId], (err, stats) => {
        if (err) {
            return res.json({ success: false, message: "Ошибка" });
        }
        db.all(
            "SELECT reviews.idReview, rating, comment, createdAt, idUser, (SELECT avatar FROM users WHERE idUser = reviews.idUser) as avatar, (SELECT FIO FROM users WHERE idUser = reviews.idUser) as FIO FROM reviews WHERE idProduct = ? ORDER BY createdAt DESC", [productId], (err, reviews) => {
                if (err) {
                    return res.json({ success: false, message: "Ошибка" });
                }
                return res.json({success: true, avgRating: stats.avg ? parseFloat(stats.avg).toFixed(1) : "0", count: stats.count || 0, reviews: reviews || []});
            }
        );
    });
});

app.delete("/api/reviews/:id", (req, res) => {
    const reviewId = req.params.id;
    const { login } = req.body;
    db.get("SELECT idRole FROM users WHERE login = ?", [login], (err, user) => {
        if (err || !user || user.idRole !== 2) {
            return res.json({ success: false, message: "Доступ запрещён" });
        }
        db.run("DELETE FROM reviews WHERE idReview = ?", [reviewId], function(err) {
            if (err) {
                return res.json({ success: false, message: "Ошибка" });
            }
            if (this.changes === 0) {
                return res.json({ success: false, message: "Не найдено" });
            }
            else {
                return res.json({ success: true, message: "Отзыв удалён" });
            }
        });
    });
});
app.listen(port, () => {
    console.log("Сервер запущен на http://localhost: " + port);
})


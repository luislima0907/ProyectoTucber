export default class UserController{

    constructor(router, userService){
        this.userService = userService


        router.get("/users", async (req, res) => {
           res.send("hola")
        })
    }
}
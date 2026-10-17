import { User } from "../users/user.js"
import { UserLoginDTO } from "../users/userLoginDTO.js"

export default class AuthController{

    constructor(router, authService){
        this.router = router
        this.authService = authService

        router.post("/register", async (req, res) =>{
            
            const result = User.safeParse(req.body )

            try{
                 if (!result.success){

                    res.status(400).send(result.error.issues.map(e => e.path + e.message)) 
                }
                
                console.log(result.data)
                await this.authService.registerUser(result.data)
                res.status(200).send(`Se ha creado el usuario ${result.data}`)
                
     
            }catch(e){
                res.status(500).send("No se ha podido crear el usuario")
            }
           
        })

        router.post("/login", async (req, res) => {
            const result = UserLoginDTO.safeParse(req.body)
            
            if (!result.success){
                res.status(400).send(result.error.issues.map(e => e.path + e.message)) 
            }
            const token = await this.authService.loginUser(result.data)

            res.status(200).send({message:"se ha creado el token", token: token})

        })
    }
}
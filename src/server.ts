import "dotenv/config";
import Fastify from "fastify";
import askRoute from "./routes/ask.js";

const app = Fastify({logger : true})

app.register(askRoute)

const start = async () => {
    try{
        await app.listen({port : 3000});
        console.log("server running on port 3000");
    }catch(err){
        app.log.error(err);
        process.exit(1)
    }
};

start();

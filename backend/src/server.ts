import { app } from "./app.js";
import { env } from "./config.js";

app.listen(env.PORT, () => {
  console.log(`Boom Asistente API escuchando en http://localhost:${env.PORT}`);
});

const express = require('express');

const app = express();
const morgan = require('morgan');
const cors = require('cors');
const busboy = require('connect-busboy');
const busboyBodyParser = require('busboy-body-parser');
require('./database');

// MIDDLEWARES
app.use(morgan('dev'));
app.use(express.json());
app.use(busboy());
app.use(busboyBodyParser());
app.use(cors());

// VARIABLES
app.set('port', 8000);

// ROTAS
app.use('/salao', require('./src/routers/salao.routes'));
app.use('/servico', require('./src/routers/servicos.routes'));
app.use('/horario', require('./src/routers/horario.routes'));
app.use('/colaborador', require('./src/routers/colaborador.routes'));
app.use('/cliente', require('./src/routers/cliente.routes'));
app.use('/agendamento', require('./src/routers/agendamento.routes'));

app.listen(app.get('port'), () => console.log(`WS escutando na porta ${app.get('port')}`));


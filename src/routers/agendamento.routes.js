const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment');
const util = require('../../util');
const _ = require('lodash');


const Cliente = require('../models/cliente');
const Salao = require('../models/salao');
const Servico = require('../models/servico');
const Colaborador = require('../models/colaborador');
const Agendamento = require('../models/agendamento');
const Horario = require('../models/horario');

router.post('/', async (req, res) => {
    const db = mongoose.connection;
    const session = await db.startSession();
    session.startTransaction();
    
    try {
        const { clienteId, salaoId, servicoId, colaboradorId } = req.body;

        // RECUPERAR O CLIENTE
        const cliente = await Cliente.findById(clienteId).select('nome endereco');

        // RECUPERAR O SALÃO
        const salao = await Salao.findById(salaoId).select('_id nome');

        // RECUPERAR O SERVIÇO
        const servico = await Servico.findById(servicoId).select('preco titulo comissao');

        // RECUPERAR O COLABORADOR
        const colaborador = await Colaborador.findById(colaboradorId).select('nome');

        // CRIAR AGENDAMENTO
        const agendamento = await new Agendamento({
            ...req.body,
            comissao: servico.comissao,
            valor: servico.preco,  
        }).save({ session });

        await session.commitTransaction();
        session.endSession();
        
        res.json({ error: false, agendamento });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.json({ error: true, message: err.message });
    }
});

router.post('/filter', async (req, res) => {
    try {
        const { periodo, salaoId } = req.body;

        const agendamentos = await Agendamento.find({
            salaoId,
            data: {
                $gte: moment(periodo.inicio).startOf('day'), // $gte singnifica MAIOR OU IGUAL
                $lte: moment(periodo.fim).endOf('day'), // $lte significa MENOR OU IGUAL (less then equal)
            },
        }).populate([
            { path: 'servicoId', select: 'titulo duracao' },
            { path: 'colaboradorId', select: 'nome' },
            // { path: 'clienteId', select: 'telefone' },
          ]);
        res.json({ error: false, agendamentos });

    } catch(err) {
        res.json({ error: true, message: err.message})
    }
});

router.post('/dias-disponiveis', async (req, res) => {
    try {
        const { data, salaoId, servicoId } = req.body;
        const horarios = await Horario.find({ salaoId });
        const servico = await Servico.findById(servicoId).select('duracao');

        let agenda = [];
        let colaboradores = [];
        let lastDay = moment(data);

        // DURAÇÃO DO SERVIÇO
        const servicoMinutos = util.hourToMinutes(moment(servico.duracao)
               .format('HH:mm'));

        const servicoSlots = util.sliceMinutes(
        servico.duracao,
        moment(servico.duracao).add(servicoMinutos, 'minutes'),
        util.SLOT_DURATION,
        ).length;

        // PROCURE NOS PROXIMOS 365 DIAS ATÉ A AGENDA CONTER 7 DIAS DISPONIVEIS
        for(let i = 0; i <= 365 && agenda.length <= 7; i++) {
            const espacosValidos = horarios.filter((horario) => {

                // VERIFICAR O DIA DA SEMANA
                const diaDaSemanaDisponivel = 
                    horario.dias.includes(moment(lastDay).day()); // vai de 0 a 6 dias(seg a dom)


                // VERIFICAR ESPECIALIDADE DISPONIVEL
                const servicoDisponivel = horario.especialidades.includes(servicoId);
                

                return diaDaSemanaDisponivel && servicoDisponivel;
            });

            /*
                TODOS OS COLABORADORES DISPONIVEIS NO DIA E 
                SEUS HORÁRIOS
                [
                    {
                        "2021-10-29": {
            colaborador     "21321321": {
                                "12:00",
            horarios            "13:00",
                                ...,
                            }
                        }
                    }
                ]
            */

            if(espacosValidos.length > 0) {

                let todosHoraiosDias = {};

                for(let espaco of  espacosValidos) {

                    for(let colaboradorId of espaco.colaboradores) {

                        if(!todosHoraiosDias[colaboradorId]) {
                            
                            todosHoraiosDias[colaboradorId] = [];
                        }

                        // PEGAR TODOS OS HORARIOS DO ESPAÇO E JOGAR PARA DENTRO DO COLABORADOR

                        todosHoraiosDias[colaboradorId] = [
                            ...todosHoraiosDias[colaboradorId],
                            ...util.sliceMinutes(
                                util.mergeDateTime(lastDay, espaco.inicio),
                                util.mergeDateTime(lastDay, espaco.fim),
                                util.SLOT_DURATION  
                            )
                        ];
                    }
                }

                // VERIFICAR OCUPAÇÃO DE CADA ESPECIALISTA NO DIA
                for(let colaboradorId of Object.keys(todosHoraiosDias)) {

                    //RECUPERAR AGENDAMENTOS
                    const agendamentos = await Agendamento.find({
                        colaboradorId,
                        data: {
                             $gte: moment(lastDay).startOf('day'),
                             $lte: moment(lastDay).endOf('day'),
                        },
                    })
                      .select('data servicoId -_id')
                      .populate('servicoId', 'duracao');

                      
                    // RECUPERAR HORARIOS AGENDADOS
                    let horariosOcupados = agendamentos.map(agendamento => ({
                        inicio: moment(agendamento.data),
                        final: moment(agendamento.data).add(util.hourToMinutes(
                            moment(agendamento.servicoId.duracao).format('HH:mm')
                        ), 'minutes'),
                    }));

                    // RECUPERAR TODOS OS SLOTS ENTRE AGENDAMENTOS
                    horariosOcupados = horariosOcupados.map(horario => 
                        util.sliceMinutes(horario.inicio, horario.final, util.SLOT_DURATION)).flat();

                    // REMOVENDO TODOS OS HORARIOS/SLOTS OCUPADOS
                    let horariosLivres = 
                    util.splitByValue(todosHoraiosDias[colaboradorId].map(horarioLivre => {

                        return horariosOcupados.includes(horarioLivre)? '-' : horarioLivre;

                    }), '-').filter(space => space.length > 0);

                    // VERIFICANDO SE EXISTE ESPAÇO SUFICIENTE NO SLOT
                    horariosLivres = horariosLivres.filter(horarios => horarios.length > servicoSlots);

                    /*
                        VERIFICANDO SE OS HORARIOS DENTRO DO SLOT
                        TEM A QUANTIDADE NESSARIA
                    */
                    horariosLivres = horariosLivres.map(slot => 
                        slot.filter((horario, index) =>
                            slot.length - index >= servicoSlots
                        )
                    ).flat();

                    // FORMATANDO HORÁRIOS DE 2 EM 2
                    horariosLivres = _.chunk(horariosLivres, 2);

                    // REMOVER COLABORADOR CASO NÃO TENHA NENHUM ESPAÇO
                    if(horariosLivres.length === 0) {
                        todosHoraiosDias = _.omit(todosHoraiosDias, colaboradorId); 
                    } else {
                        todosHoraiosDias[colaboradorId] = horariosLivres;
                    }
                }

                // VERIFICAR SE TEM ESPECIALISTA DISPONIVEL NAQUELE DIA
                const totalEspecialistas = Object.keys(todosHoraiosDias).length;

                if(totalEspecialistas > 0) {
                    colaboradores.push(Object.keys(todosHoraiosDias));
                    agenda.push({
                        [lastDay.format('DD/MM/YYYY')]: todosHoraiosDias,
                    });
                }
            }

            lastDay = lastDay.add(1, 'day');
        }

        // RECUPERANDO DADOS DOS COLABORADOS
        colaboradores = _.uniq(colaboradores.flat());

        colaboradores = await Colaborador.find({
            _id: { $in: colaboradores},
        }).select('nome foto');

        colaboradores = colaboradores.map(c => ({
            ...c._doc,
            nome: c.nome.split(' ')[0],
        }));

        res.json({ 
            error: false, 
            colaboradores,
            agenda,
        });

    } catch(err) {
        res.json({ error: true, message: err.message });
    }
});

module.exports = router;
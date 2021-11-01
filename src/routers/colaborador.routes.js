const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Colaborador = require('../models/colaborador');
const SalaoColaborador = require('../models/relationship/salao_colaborador');
const ColaboradorServico = require('../models/relationship/colaborador_servico');

router.post('/', async (req, res) => {
        const db = mongoose.connection;
        const session = await db.startSession();
        session.startTransaction();
        
        try {
            
            const { colaborador, salaoId } =  req.body;

            // VERIFICAR SE O COLABORADOR EXISTE
            const existentColaborador = await Colaborador.findOne({
                $or: [ // ele vai procurar um email ou telefone.
                    { email: colaborador.email },
                    { telefone: colaborador.telefone },
                ]
            });

            // CRIANDO COLABORADOR
            let newColaborador = null;
            newColaborador = await Colaborador({
                ...colaborador,
            }).save({ session });

            // RELACIONAMENTO
            const colaboradorId = existentColaborador ? existentColaborador._id : newColaborador._id;

            // VERIFICA SE JA EXISTE O RELACIONAMENTO COM O SALÃO
            const existentRelationship = await SalaoColaborador.findOne({
                salaoId,
                colaboradorId,
                status: { $ne: 'E'},
            });

            if(!existentRelationship) {
                await new SalaoColaborador({
                    salaoId,
                    colaboradorId,
                    status: colaborador.vinculo,
                }).save({ session });
            }

            // SE JA EXISTIR VINCULO ENTRE COLABORADOR E SALÃO
            if(existentRelationship) {
                await SalaoColaborador.findOneAndUpdate({
                    salaoId,
                    colaboradorId,
                }, { status: colaborador.vinculo },
                   { session }
                );
            }


            // RELAÇÃO COM AS ESPECIALIDADES
            await ColaboradorServico.insertMany(
                colaborador.especialidade.map(
                    (servicoId) => ({
                        servicoId,
                        colaboradorId,
                    }), 
                    { session })
            );

            await session.commitTransaction();
            session.endSession();

            if(existentColaborador && existentRelationship) {
                res.json({ error: true, message: 'Colaborador já cadastrado.' });
            } else {
                res.json({ error: false });
            }

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            
            res.json({ error: true, message: err.message });
        }
});

router.put('/:colaboradorId', async (req, res) => {
    try {
        const { vinculo, vinculoId, especialidade }  = req.body;
        const { colaboradorId } = req.params;

        // VINCULO
        await SalaoColaborador.findByIdAndUpdate(vinculoId, { status: vinculo });

        // ESPECIALIDADES
        await ColaboradorServico.deleteMany({
            colaboradorId,
        });

        await ColaboradorServico.insertMany(
            especialidade.map(
                (servicoId) => ({
                    servicoId,
                    colaboradorId,
                }))
        );
        
        res.json({ error: false });

    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.delete('/vinculo/:id', async (req, res) => {
    try {
        await SalaoColaborador.findByIdAndUpdate(req.params.id, { status: 'E'} );

        res.json({ error: false });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.post('/filter', async (req, res) => {
    try {
        const colaboradores = await Colaborador.find(req.body.filters);

        res.json({ error: false, colaboradores });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.get('/salao/:salaoId', async (req, res) => {
    try {
        const { salaoId } = req.params;
        const listColaboradores = [];

        // RECUPERAR VINCULOS
        const salaoColaboradores = await SalaoColaborador.find({
            salaoId,
            status: { $ne: 'E' },
        }).populate({ path: 'colaboradorId', select: '-senha' }).select('colaboradorId dataCadastro status');

        for(let vinculo of salaoColaboradores) {
            const especialidades = await ColaboradorServico.find({
                colaboradorId: vinculo.colaboradorId._id,
            });

            listColaboradores.push({
                ...vinculo._doc,
                especialidades,
            });
        }

        res.json({ 
            error: false, 
            colaboradores: listColaboradores.map((vinculo) => ({
                ...vinculo.colaboradorId._doc,
                vinculoId: vinculo._id,
                vinculo: vinculo.status,
                especialidades: vinculo.especialidades,
                dataCadastro: vinculo.dataCadastro,
            })) 
        })

    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

module.exports = router;
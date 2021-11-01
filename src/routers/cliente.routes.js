const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cliente = require('../models/cliente');
const ClienteSalao = require('../models/relationship/cliente_salao');

router.post('/', async (req, res) => {
    const db = mongoose.connection;
    const session = await db.startSession();
    session.startTransaction();
    
    try {
        
        const { cliente, salaoId } =  req.body;

        // VERIFICAR SE O COLABORADOR EXISTE
        const existentCliente = await Cliente.findOne({
            $or: [ // ele vai procurar um email ou telefone.
                { email: cliente.email },
                { telefone: cliente.telefone },
            ]
        });

        // CRIANDO CLIENTE
        let newCliente = null;
        newCliente = await Cliente({
            ...cliente,
        }).save({ session });

        // RELACIONAMENTO
        const clienteId = existentCliente ? existentCliente._id : newCliente._id;

        // VERIFICA SE JA EXISTE O RELACIONAMENTO COM O SALÃO
        const existentRelationship = await ClienteSalao.findOne({
            salaoId,
            clienteId,
            status: { $ne: 'E'},
        });

        if(!existentRelationship) {
            await new ClienteSalao({
                salaoId,
                clienteId,
            }).save({ session });
        }

        // SE JA EXISTIR VINCULO ENTRE CLIENTE E SALÃO
        if(existentRelationship) {
            await ClienteSalao.findOneAndUpdate({
                salaoId,
                clienteId,
            }, { status: 'A' },
               { session }
            );
        } 

        await session.commitTransaction();
        session.endSession();

        if(existentCliente && existentRelationship) {
            res.json({ error: true, message: 'Cliente já cadastrado.' });
        } else {
            res.json({ error: false });
        }

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        
        res.json({ error: true, message: err.message });
    }
});

router.post('/filter', async (req, res) => {
    try {
        const clientes = await Cliente.find(req.body.filters);

        res.json({ error: false, clientes });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.get('/salao/:salaoId', async (req, res) => {
    try {
        const { salaoId } = req.params;

        // RECUPERAR VINCULOS
        const clientes = await ClienteSalao.find({
            salaoId,
            status: { $ne: 'E' },
        }).populate('clienteId').select('clienteId dataCadastro');

        res.json({ 
            error: false, 
            clientes: clientes.map((vinculo) => ({
                ...vinculo.clienteId._doc,
                vinculoId: vinculo._id,
                dataCadastro: vinculo.dataCadastro,
            })) 
        });

    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

router.delete('/vinculo/:id', async (req, res) => {
    try {
        await ClienteSalao.findByIdAndUpdate(req.params.id, { status: 'E'} );

        res.json({ error: false });
    } catch (err) {
        res.json({ error: true, message: err.message });
    }
});

module.exports = router;
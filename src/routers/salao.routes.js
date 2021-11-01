const express = require('express');
const router = express.Router();
const Salao = require('../models/salao');
const Servico = require('../models/servico');
const Horario = require('../models/horario');
const turf = require('@turf/turf');
const util = require('../../util');

router.post('/', async (req, res) => {
    try {

        const salao = await new Salao(req.body).save();

        res.json({ salao });

    } catch(err) {
        res.json({ error: true, message: err.message });
    }
});

router.get('/servicos/:salaoId', async (req, res) => {
   try {

        const { salaoId } = req.params;

        const servicos = await Servico.find({
            salaoId,
            status: 'A'

        }).select(' _id titulo');

        // O front end ira receber assim [{ lable: 'Servico', value: '1212121'*(id)*}]
        res.json({
            servicos: servicos.map(s => ({ 
                label: s.titulo, 
                value: s._id 
            })),

            
        });

   } catch(err) {
        res.json({ error: true, message: err.message });
   }
});

router.get('/:id', async (req, res) => {
    try {
        const salao = await Salao.findById(req.params.id).select(
            'capa nome endereco.cidade geo.coordinates telefone'
        );


        // CALCULO DA DISTANCIA
        const distance = turf.distance(
            turf.point(salao.geo.coordinates),
            turf.point([-23.4549341, -46.6062336]),
        );

        // ESTÁ ABERTO
        const horarios = await Horario.find({
            salaoId: req.params.id,
        }).select('dias inicio fim');

        const isOpened = util.isOpened(horarios);

        res.json({ error: false, salao: {...salao._doc, distance, isOpened} });
    } catch(err) {
        res.json({ error: true, message: err.message });
    }
});

module.exports = router;
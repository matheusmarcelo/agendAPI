const moment = require('moment');

module.exports = {
    SLOT_DURATION: 30,
    isOpened: (horarios) => {
      // VERIFICANDO SE EXISTE REGISTRO NAQUELE DIA DA SEMANA
      const horariosNoDiaDeHoje = horarios.filter((h) => h.dias.includes(moment().day()));
      if (horariosNoDiaDeHoje.length > 0) {
        // VERIFICANDO HORARIOS
        for (let h of horariosNoDiaDeHoje) {
          const inicio = moment(moment(h.inicio).format('HH:mm'), 'HH:mm:ss');
          const fim = moment(moment(h.fim).format('HH:mm'), 'HH:mm:ss');
          if (moment().isBetween(inicio, fim)) {
            return true;
          }
        }
        return false;
      }
      return false;
    },
    hourToMinutes: (hourMinutes) => {
        // 1:20
        const [hour, minutes] = hourMinutes.split(':');
        return parseInt(parseInt(hour) * 60 + parseInt(minutes));
    },

    sliceMinutes: (start, end, duration) => {
        let slices = [];
        let count = 0;
    
        // 90 = 1:30
        start = moment(start);
        // 180 = 03:00
        end = moment(end);
    
        while (end > start) {
          slices.push(start.format('HH:mm'));
    
          start = start.add(duration, 'minutes');
          count++;
        }
        return slices;
      },

    mergeDateTime: (date, time) => {
        const merged = `${moment(date).format('YYYY-MM-DD')}T${moment(time).format( 'HH:mm')}`;

        return merged;
    },

    splitByValue: (array, value) => {
        let newArray = [[]];
        array.forEach((item) => {
          if (item !== value) {
            newArray[newArray.length - 1].push(item);
          } else {
            newArray.push([]);
          }
        });
        return newArray;
      },
}
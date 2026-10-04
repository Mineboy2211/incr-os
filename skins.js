'use strict';
/* Process skins: alternative names (and a little icon) for the 8 processes.
 * Display only: the commands /daemon, /thread... keep working whatever the skin,
 * and the skin's own names work as commands too.
 *
 * To add a skin: add an entry with 8 names, 8 icons, and the achievement id that
 * unlocks it (null = always unlocked).
 */

const SKINS = {
  default: {
    unlock: null,
    names: ['DAEMON', 'THREAD', 'FORK', 'PIPE', 'SOCKET', 'HYPERVISOR', 'CLUSTER', 'MAINFRAME'],
    icons: ['(d)', '~~', 'Y', '|=|', '<o>', '[H]', '[:::]', '[####]'],
  },
  kitchen: {
    unlock: 'a5', // Gigabyte
    names: ['TOASTER', 'KETTLE', 'BLENDER', 'MICROWAVE', 'FRIDGE', 'OVEN', 'DISHWASHER', 'RESTAURANT'],
    icons: ['[=]', '(_)>', '|V|', '[::]', '[  ]', '[##]', '[~~]', '/^^\\'],
  },
  space: {
    unlock: 'a6', // first reboot
    names: ['PROBE', 'ROVER', 'SATELLITE', 'STATION', 'SHUTTLE', 'MOTHERSHIP', 'DYSON SPHERE', 'GALAXY'],
    icons: ['.', 'o-o', '-[]-', '=[]=', '/\\', '<===>', '(@)', '*~*~*'],
  },
  fantasy: {
    unlock: 'a11', // first format
    names: ['IMP', 'GOBLIN', 'ORC', 'TROLL', 'WIZARD', 'DRAGON', 'LICH', 'DEMIGOD'],
    icons: ['^', 'g', 'O', 'T', '*/', '>=<', 'x_x', '\\o/'],
  },
  cats: {
    unlock: 'a14', // script kiddie
    names: ['KITTEN', 'CAT', 'TABBY', 'LYNX', 'PUMA', 'TIGER', 'LION', 'CAT GOD'],
    icons: ['=^.^=', '=^-^=', '=^o^=', '=^w^=', '=^x^=', '=^O^=', '=^M^=', '=^*^='],
  },
  leet: {
    unlock: 'a15', // hard mode (beat a challenge)
    names: ['D43M0N', 'THR34D', 'F0RK', 'P1P3', 'S0CK3T', 'HYP3RV1S0R', 'CLU5T3R', 'M41NFR4M3'],
    icons: ['1', '10', '011', '0100', '10101', '011010', '1101011', '01001101'],
  },
};

// Textos, prontuários e objetivos
export const NOTES = {
  n0: { kind: 'Bilhete da diretoria', num: 'Avulso', date: '01/10/1974', text: 'Vigia: o Pavilhão 9 será lacrado amanhã às 06h. A energia foi cortada às 02h e a porta da frente será trancada por fora. Se precisar sair, use a saída de emergência no fim do corredor. Ela só abre com o gerador ligado. A chave da casa de máquinas está no posto de enfermagem. A chave do posto ficou com a enfermeira Irene.' },
  r1: { kind: 'Prontuário', num: 'Nº 0412', date: '03/02/1974', text: 'Paciente afirma que alguém caminha pelo corredor depois que as luzes apagam. Passos lentos, sempre parando na porta do quarto. Dose noturna aumentada.' },
  r2: { kind: 'Prontuário', num: 'Nº 0377', date: '19/02/1974', text: 'Paciente não dorme há quatro noites. Repete que a enfermeira do turno da noite não tem rosto. Observação: o pavilhão não tem enfermeira no turno da noite desde 1971.' },
  r3: { kind: 'Livro do vigia', num: 'Fl. 88', date: '14/03/1974', text: '03h10. Contei os leitos ocupados: 31. O pavilhão tem 30 leitos. Recontei às 03h25: 30. Ninguém passou pela porta. O telefone do posto tocou duas vezes. A linha está cortada desde janeiro.' },
  r4: { kind: 'Prontuário', num: 'Nº 0291', date: '02/05/1974', text: 'Paciente desenhou a mesma figura mais de duzentas vezes. Alta, braços compridos, touca de enfermeira. Em cada desenho ela está um pouco mais perto. No último, só aparece a mão.' },
  r5: { kind: 'Anotação do Dr. Arruda', num: 'Avulsa', date: '21/08/1974', text: 'Ela não se move enquanto a luz está sobre ela. Só enquanto a luz está sobre ela. Ela ouve passos apressados. Os armários são o único lugar onde ela não procura, a não ser que veja você entrar. Não respire alto.' },
  r6: { kind: 'Ficha de funcionária', num: 'Mat. 1108', date: '—', text: 'Irene Vasconcelos, enfermeira-chefe do turno da noite. Admitida em 1952. Afastada em março de 1971, após o incidente na sala de tratamento. Óbito: março de 1971. Anotação a lápis no verso: ela continua batendo o ponto.' }
};
export const RECORD_IDS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

export function objective(S) {
  if (S.power) return 'Fuja pela saída de emergência';
  if (!S.flags.knowsExit) return 'Encontre uma saída';
  if (!S.inv.keyPosto && !S.unlocked.keyPosto) return 'Encontre a chave do posto de enfermagem';
  if (!S.inv.keyMaq) return 'Pegue a chave da casa de máquinas no posto';
  if (S.fuses.length < 3) return `Encontre os fusíveis da casa de máquinas (${S.fuses.length}/3)`;
  if (S.fusesIn < 3) return 'Coloque os fusíveis na caixa da casa de máquinas';
  return 'Ligue o gerador';
}

export function stage(S) {
  if (S.power) return 4;
  if (S.fuses.length >= 3) return 3;
  if (S.fuses.length >= 1) return 2;
  if (S.active) return 1;
  return 0;
}

export const ENDINGS = {
  normal: { title: 'Você saiu do Pavilhão 9', stamp: 'Arquivado', text: 'A porta de emergência se fechou atrás de você. O ar frio da madrugada. Pelo vidro aramado, alguém de touca branca continua parada no fim do corredor, esperando o próximo turno.' },
  true: { title: 'Turno encerrado', stamp: 'Leito 31 vago', text: 'Você saiu com os seis prontuários. No último, a ficha de Irene, alguém escreveu a lápis: dispensada. Pela primeira vez em três anos, o corredor ficou vazio. A contagem deu 30.' },
  dead: { title: 'Ela te encontrou', stamp: 'Leito 31', text: '' }
};
export const DEATH_TEXT = [
  'O pavilhão tem 30 leitos. Hoje à noite, a contagem deu 31.',
  'Ela ouve passos apressados. Alguém escreveu isso em um dos prontuários.',
  'Ela não se move enquanto a luz está sobre ela.',
  'Os armários são o único lugar onde ela não procura.',
  'Prenda a respiração quando ela passar perto do armário.'
];

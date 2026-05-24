import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';

const token = process.env.DISCORD_BOT_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;
const apiUrl = process.env.SYNCSAGA_API_URL || 'http://localhost:4000';

const commands = [
  new SlashCommandBuilder()
    .setName('watch')
    .setDescription('Create a SyncSaga watch party room')
    .addStringOption(opt => opt.setName('anime').setDescription('Anime title').setRequired(true))
    .addIntegerOption(opt => opt.setName('episode').setDescription('Episode number').setRequired(false)),
  new SlashCommandBuilder()
    .setName('nowwatching')
    .setDescription('Show active SyncSaga rooms in this server'),
  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Schedule a watch party')
    .addStringOption(opt => opt.setName('anime').setDescription('Anime title').setRequired(true))
    .addStringOption(opt => opt.setName('date').setDescription('Date (YYYY-MM-DD)').setRequired(true))
    .addStringOption(opt => opt.setName('time').setDescription('Time (HH:MM)').setRequired(true)),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Slash commands registered.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
})();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', () => {
  console.log(`🤖 Discord bot logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  try {
    switch (commandName) {
      case 'watch': {
        await interaction.deferReply();
        const anime = options.getString('anime', true);
        const episode = options.getInteger('episode');

        const roomName = episode ? `${anime} - Episode ${episode}` : `${anime} Watch Party`;

        const { data } = await axios.post(`${apiUrl}/api/rooms`, {
          name: roomName,
          isPrivate: false,
          maxUsers: 10,
          animeTitle: anime,
        }, {
          headers: { 'Authorization': `Bearer ${process.env.SYNCSAGA_API_TOKEN}` },
        });

        const room = data.room;
        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle('🎬 Watch Party Created!')
          .setDescription(`**${anime}**${episode ? ` - Episode ${episode}` : ''}`)
          .addFields(
            { name: 'Room', value: room.name, inline: true },
            { name: 'Members', value: `0/${room.max_users}`, inline: true },
            { name: 'Invite Link', value: `[Click to join](${apiUrl.replace(':4000', ':3000')}/room/${room.id})` },
          )
          .setFooter({ text: 'SyncSaga' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'nowwatching': {
        await interaction.deferReply({ ephemeral: true });
        const { data } = await axios.get(`${apiUrl}/api/rooms`, {
          headers: { 'Authorization': `Bearer ${process.env.SYNCSAGA_API_TOKEN}` },
        });

        const rooms = data.rooms || [];
        if (rooms.length === 0) {
          await interaction.editReply({ content: 'No active watch parties right now. Create one with `/watch`!' });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle('📺 Currently Watching')
          .setDescription(rooms.slice(0, 10).map((r: any) =>
            `**${r.name}** — ${r.current_episode || 'No episode set'} — [Join](${apiUrl.replace(':4000', ':3000')}/room/${r.id})`
          ).join('\n'))
          .setFooter({ text: `Showing ${Math.min(rooms.length, 10)} of ${rooms.length} rooms` });

        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'schedule': {
        await interaction.deferReply();
        const anime = options.getString('anime', true);
        const date = options.getString('date', true);
        const time = options.getString('time', true);

        const embed = new EmbedBuilder()
          .setColor(0xf59e0b)
          .setTitle('📅 Watch Party Scheduled')
          .setDescription(`**${anime}**`)
          .addFields(
            { name: 'Date', value: date, inline: true },
            { name: 'Time', value: time, inline: true },
            { name: 'Scheduled by', value: interaction.user.username, inline: true },
          )
          .setFooter({ text: 'SyncSaga - You will be notified when it starts' })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        break;
      }
    }
  } catch (error: any) {
    console.error('Command error:', error);
    await interaction.editReply({ content: `Error: ${error.message || 'Something went wrong'}` }).catch(() => {});
  }
});

client.login(token).catch(console.error);

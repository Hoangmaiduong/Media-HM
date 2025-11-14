import React, { useState, useCallback, useEffect } from 'react';
import { TeamCard } from './components/TeamCard';
import { UserGroupIcon } from './components/icons/UserGroupIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { generateTeamName } from './services/geminiService';

const App: React.FC = () => {
  const [tournamentName, setTournamentName] = useState<string>('Giải Giao Hữu Hoàng Mai');
  const [playersString, setPlayersString] = useState<string>('An\nBình\nCường\nDung\nGiang\nHương\nKhánh\nLinh\nMinh\nNam\nNga\nPhong');
  const [seedPlayersString, setSeedPlayersString] = useState<string>('An\nCường');
  const [numTeams, setNumTeams] = useState<number>(6);
  const [animationDelay, setAnimationDelay] = useState<number>(0.1);
  const [teams, setTeams] = useState<string[][]>([]);
  const [animationState, setAnimationState] = useState<{ teamIndex: number; playerIndex: number } | null>(null);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [loadingNameForTeam, setLoadingNameForTeam] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleGenerateTeams = useCallback(() => {
    setError(null);
    setTeams([]);
    setAnimationState(null);
    
    const allPlayers = playersString.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    const seedPlayers = seedPlayersString.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    const regularPlayers = allPlayers.filter(p => !seedPlayers.includes(p));

    if (numTeams <= 0) {
      setError('Số lượng đội phải lớn hơn 0.');
      return;
    }
    if (allPlayers.length < numTeams) {
      setError('Không đủ người chơi để tạo số lượng đội mong muốn.');
      return;
    }
    if (seedPlayers.length > numTeams) {
      setError('Số lượng vận động viên hạt giống không thể nhiều hơn số lượng đội.');
      return;
    }
    // Check if all seed players are in the main player list
    const missingSeeds = seedPlayers.filter(seed => !allPlayers.includes(seed));
    if (missingSeeds.length > 0) {
      setError(`Vận động viên hạt giống "${missingSeeds.join(', ')}" không có trong danh sách người chơi.`);
      return;
    }

    // Shuffle both lists
    const shuffledSeeds = [...seedPlayers].sort(() => Math.random() - 0.5);
    const shuffledRegulars = [...regularPlayers].sort(() => Math.random() - 0.5);

    const newTeams: string[][] = Array.from({ length: numTeams }, () => []);
    
    // Distribute seed players first, one per team
    shuffledSeeds.forEach((player, index) => {
      newTeams[index].push(player);
    });

    // Distribute regular players to the teams with the fewest members
    shuffledRegulars.forEach(player => {
      // Find the team with the fewest players
      const smallestTeam = newTeams.reduce((prev, curr) => (curr.length < prev.length ? curr : prev));
      smallestTeam.push(player);
    });

    setTeams(newTeams);
    setTeamNames(new Array(numTeams).fill(''));
    setAnimationState({ teamIndex: 0, playerIndex: -1 }); // Start animation
  }, [playersString, seedPlayersString, numTeams]);


  useEffect(() => {
    if (!animationState || teams.length === 0) {
      return;
    }

    const { teamIndex, playerIndex } = animationState;

    if (teamIndex >= teams.length - 1 && playerIndex >= teams[teamIndex].length - 1) {
      return;
    }

    const timerId = setTimeout(() => {
      if (playerIndex < teams[teamIndex].length - 1) {
        setAnimationState({ teamIndex, playerIndex: playerIndex + 1 });
      } else if (teamIndex < teams.length - 1) {
        setAnimationState({ teamIndex: teamIndex + 1, playerIndex: -1 });
      }
    }, animationDelay * 1000);

    return () => clearTimeout(timerId);
  }, [animationState, teams, animationDelay]);


  const handleGenerateTeamName = async (teamIndex: number) => {
    setLoadingNameForTeam(teamIndex);
    try {
      const name = await generateTeamName();
      setTeamNames(prevNames => {
        const newNames = [...prevNames];
        newNames[teamIndex] = name;
        return newNames;
      });
    } catch (e) {
      console.error('Không thể tạo tên đội:', e);
    } finally {
      setLoadingNameForTeam(null);
    }
  };

  const handleExportImage = async () => {
    setIsExporting(true);
    setError(null);
    try {
        const CARD_WIDTH = 360;
        const BASE_CARD_HEIGHT = 160;
        const PLAYER_ROW_HEIGHT = 32;
        const GAP = 24;
        const PADDING = 24;
        const TITLE_HEIGHT = 60; // Space for the tournament name title
        const FONT_FAMILY = 'Inter, sans-serif';
        const cols = 2;

        const cardHeights = teams.map(team => BASE_CARD_HEIGHT + team.length * PLAYER_ROW_HEIGHT);

        const rowHeights = [];
        for (let i = 0; i < teams.length; i += cols) {
            const heightsInRow = cardHeights.slice(i, i + cols);
            if (heightsInRow.length > 0) {
                 rowHeights.push(Math.max(...heightsInRow));
            }
        }
        
        const totalCardsHeight = rowHeights.reduce((a, b) => a + b, 0) + (rowHeights.length > 0 ? (rowHeights.length - 1) * GAP : 0);

        const svgWidth = cols * CARD_WIDTH + (cols - 1) * GAP + PADDING * 2;
        const svgHeight = totalCardsHeight + PADDING * 2 + TITLE_HEIGHT;

        const tournamentTitleSvg = tournamentName ? `
            <text x="${svgWidth / 2}" y="${PADDING + 30}" font-size="28px" font-weight="700" fill="#0369a1" font-family="${FONT_FAMILY}" text-anchor="middle">
                ${tournamentName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </text>
        ` : '';

        let currentY = PADDING + TITLE_HEIGHT;
        const teamCardsSvg = teams.map((team, index) => {
            const teamName = teamNames[index] || '';
            const col = index % cols;
            const row = Math.floor(index / cols);

            if (col === 0 && index > 0) {
                currentY += rowHeights[row - 1] + GAP;
            }

            const x = PADDING + col * (CARD_WIDTH + GAP);
            const y = currentY;

            const cardHeight = cardHeights[index];

            const playersSvg = team.map((player, pIndex) => `
                <g transform="translate(0, ${145 + pIndex * PLAYER_ROW_HEIGHT})">
                    <rect x="0" y="0" width="${CARD_WIDTH - 48}" height="28" rx="6" fill="#f0f9ff" />
                    <text x="12" y="19" font-size="14px" fill="#0c4a6e" font-family="${FONT_FAMILY}" font-weight="500">${player.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
                </g>
            `).join('');

            return `
                <g transform="translate(${x}, ${y})">
                    <rect x="0" y="0" width="${CARD_WIDTH}" height="${cardHeight}" fill="white" rx="16" stroke="#e0f2fe" stroke-width="1.5" />
                    <text x="24" y="40" font-size="18px" font-weight="700" fill="#0369a1" font-family="${FONT_FAMILY}">Đội ${index + 1}</text>
                    ${teamName ? `<text x="24" y="72" font-size="24px" font-weight="700" fill="url(#nameGradient)" font-family="${FONT_FAMILY}">${teamName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>` : ''}
                    <line x1="24" y1="100" x2="${CARD_WIDTH - 24}" y2="100" stroke="#e0f2fe" stroke-width="1.5"/>
                    <text x="24" y="128" font-size="16px" font-weight="600" fill="#0369a1" font-family="${FONT_FAMILY}">Thành viên</text>
                    <g transform="translate(24, 0)">
                        ${playersSvg}
                    </g>
                </g>
            `;
        }).join('');

        const svgString = `
            <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="nameGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#075985;" />
                        <stop offset="100%" style="stop-color:#0c4a6e;" />
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill="#f0f9ff"/>
                ${tournamentTitleSvg}
                ${teamCardsSvg}
            </svg>
        `;

        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 2; // Increase scale for higher resolution
            canvas.width = svgWidth * scale;
            canvas.height = svgHeight * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                const pngUrl = canvas.toDataURL('image/png');
                
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = 'pickleball-teams.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            setIsExporting(false);
        };
        img.onerror = (e) => {
             console.error("Không thể tải SVG để chuyển đổi.", e);
             setError("Không thể xuất ảnh. Vui lòng thử lại.");
             setIsExporting(false);
        };
        img.src = url;

    } catch (e) {
        console.error('Lỗi khi xuất ảnh:', e);
        setError("Đã xảy ra lỗi khi tạo ảnh.");
        setIsExporting(false);
    }
};


  return (
    <div className="min-h-screen text-sky-800 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex flex-col items-center justify-center gap-2 mb-8 sm:mb-12">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
              Chia Đội Pickleball
            </h1>
          </div>
          <p className="text-lg text-sky-600">Hoàng Mai - Pickleball</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1 bg-sky-50/50 p-6 rounded-2xl shadow-md border border-sky-200">
            <h2 className="text-2xl font-semibold mb-4 text-sky-600">Thiết Lập Giải Đấu</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="tournamentName" className="block text-sm font-medium text-sky-700 mb-2">
                  Tên giải đấu
                </label>
                <input
                  id="tournamentName"
                  type="text"
                  className="w-full bg-white border border-sky-300 rounded-md p-3 text-sky-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="Ví dụ: Giải Mùa Hè 2025"
                />
              </div>
              <div>
                <label htmlFor="players" className="block text-sm font-medium text-sky-700 mb-2">
                  Tên người chơi (mỗi người một dòng)
                </label>
                <textarea
                  id="players"
                  rows={8}
                  className="w-full bg-white border border-sky-300 rounded-md p-3 text-sky-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200"
                  value={playersString}
                  onChange={(e) => setPlayersString(e.target.value)}
                  placeholder="Nhập tên người chơi tại đây..."
                />
              </div>
               <div>
                <label htmlFor="seedPlayers" className="block text-sm font-medium text-sky-700 mb-2">
                  Vận động viên hạt giống (mỗi người một dòng)
                </label>
                <textarea
                  id="seedPlayers"
                  rows={4}
                  className="w-full bg-white border border-sky-300 rounded-md p-3 text-sky-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200"
                  value={seedPlayersString}
                  onChange={(e) => setSeedPlayersString(e.target.value)}
                  placeholder="Các VĐV hạt giống sẽ không vào cùng một đội..."
                />
              </div>
              <div>
                <label htmlFor="numTeams" className="block text-sm font-medium text-sky-700 mb-2">
                  Số Lượng Đội
                </label>
                <input
                  id="numTeams"
                  type="number"
                  min="1"
                  className="w-full bg-white border border-sky-300 rounded-md p-3 text-sky-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200"
                  value={numTeams}
                  onChange={(e) => setNumTeams(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={handleGenerateTeams}
                  className="w-full sm:flex-grow bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-all transform hover:scale-105 duration-200 ease-in-out shadow-lg shadow-sky-500/20"
                >
                  Tạo Đội
                </button>
                <div className="w-full sm:w-auto flex-shrink-0">
                  <label htmlFor="animDelay" className="block text-sm font-medium text-sky-700 mb-1 text-center sm:text-left">
                    Hiện sau (s)
                  </label>
                  <input
                    id="animDelay"
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full sm:w-24 bg-white border border-sky-300 rounded-md p-2 text-center text-sky-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200"
                    value={animationDelay}
                    onChange={(e) => setAnimationDelay(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            </div>
          </aside>
          
          <main className="lg:col-span-2">
            {teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full bg-sky-50/50 rounded-2xl border-2 border-dashed border-sky-300 p-8">
                <UserGroupIcon className="w-20 h-20 text-sky-300 mb-4" />
                <div className="text-center">
                  <h3 className="text-2xl font-semibold text-sky-600">Các Đội Của Bạn Sẽ Xuất Hiện Ở Đây</h3>
                  <p className="text-sky-500 mt-2">Nhập tên người chơi, chọn số lượng đội, và nhấn "Tạo Đội" để bắt đầu.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleExportImage}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-white hover:bg-sky-100 text-sky-700 font-semibold py-2 px-4 border border-sky-300 rounded-lg shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isExporting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang xuất...
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="w-5 h-5" />
                        Tải ảnh
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {teams.map((team, index) => {
                    if (!animationState || index > animationState.teamIndex) {
                      return null;
                    }

                    let playersToShow: string[] = [];
                    if (index < animationState.teamIndex) {
                      playersToShow = team;
                    } else {
                      playersToShow = team.slice(0, animationState.playerIndex + 1);
                    }

                    return (
                      <TeamCard
                        key={index}
                        teamNumber={index + 1}
                        players={playersToShow}
                        teamName={teamNames[index]}
                        isLoading={loadingNameForTeam === index}
                        onGenerateName={() => handleGenerateTeamName(index)}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </main>
        </div>
        <footer className="text-center text-sky-600 mt-12 py-4">
          <p>Copyright © 2025 Do Huy Hoang.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
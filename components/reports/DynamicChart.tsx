'use client';

interface Props {
  type: 'bar' | 'line' | 'pie';
  data: any;
}

export default function DynamicChart({ type, data }: Props) {
  // Use chartData if available, otherwise fallbacks
  const values: number[] = data.chartData?.values || data.monthlyData || data.timelineData || new Array(12).fill(0);
  const labels: string[] = data.chartData?.labels || data.timelineLabels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Calculate max value for scaling (min 1000 to avoid flatline)
  const maxValue = Math.max(...values, 1000);

  // --- Bar Chart ---
  if (type === 'bar') {
    const minWidth = labels.length * 50;
    
    return (
      <div className="w-full h-72 flex flex-col">
        <div className="flex-1 overflow-x-auto pb-2 custom-scrollbar">
          <div className="flex items-end justify-between gap-2 h-full px-2" style={{ minWidth: `${minWidth}px` }}>
            {values.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end min-w-[40px]">
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                  <div className="font-bold text-center mb-0.5">{labels[i]}</div>
                  <div className="text-center">₹{val.toLocaleString()}</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>

                {/* Bar */}
                <div 
                  className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-all duration-300 relative min-h-[4px]"
                  style={{ height: `${(val / maxValue) * 100}%` }}
                ></div>
                
                {/* Label */}
                <div className="text-[10px] sm:text-xs text-gray-500 mt-2 text-center w-full truncate px-0.5">
                  {labels[i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Line Chart (Fixed Positioning) ---
  if (type === 'line') {
    // We construct the points for the SVG path
    const points = values.map((val, i) => {
      // Calculate X percent (0 to 100)
      const x = (i / (values.length - 1 || 1)) * 100;
      // Calculate Y percent (100 to 0 because SVG 0 is top)
      const y = 100 - ((val / maxValue) * 100);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="w-full h-72 pt-8 pb-2 flex flex-col">
        {/* Container with horizontal padding to prevent edge clipping */}
        <div className="relative flex-1 w-full px-4">
          
          {/* 1. Background Grid & Line SVG */}
          <svg 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none" 
            className="w-full h-full overflow-visible absolute inset-0"
          >
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((pos) => (
              <line 
                key={pos} 
                x1="0" y1={pos} x2="100" y2={pos} 
                stroke="#f3f4f6" 
                strokeWidth="1" 
                vectorEffect="non-scaling-stroke" 
              />
            ))}
            
            {/* The Line Path */}
            <polyline 
              fill="none" 
              stroke="#6366f1" 
              strokeWidth="2.5" 
              points={points} 
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm"
            />
          </svg>

          {/* 2. HTML Overlay for Interactive Dots & Tooltips */}
          {values.map((val, i) => {
             const leftPos = (i / (values.length - 1 || 1)) * 100;
             const topPos = 100 - ((val / maxValue) * 100);

             return (
              <div 
                key={i}
                className="absolute w-4 h-4 -ml-2 -mt-2 group cursor-pointer z-10 flex items-center justify-center"
                style={{ left: `${leftPos}%`, top: `${topPos}%` }}
              >
                {/* The Visible Dot */}
                <div className="w-2.5 h-2.5 bg-white border-[2.5px] border-indigo-500 rounded-full group-hover:scale-125 group-hover:border-indigo-700 transition-all shadow-sm"></div>

                {/* The Tooltip (HTML) */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-20 pointer-events-none shadow-xl transform translate-y-1 group-hover:translate-y-0">
                   <div className="font-semibold text-center mb-0.5">{labels[i]}</div>
                   <div className="text-center font-mono">₹{val.toLocaleString()}</div>
                   {/* Triangle */}
                   <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
             );
          })}
        </div>

        {/* X Axis Labels */}
        <div className="flex justify-between mt-4 text-[10px] sm:text-xs text-gray-400 px-4 border-t border-gray-100 pt-2 select-none">
          {labels.map((label, i) => {
            // Smart labeling: Show First, Last, and ~5 intermediate labels
            const total = labels.length;
            const step = Math.ceil(total / 6);
            const showLabel = i === 0 || i === total - 1 || i % step === 0;

            return (
              <div key={i} className="relative w-0 flex justify-center">
                 <span className={`${showLabel ? 'block' : 'hidden'} whitespace-nowrap`}>
                   {label}
                 </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Pie Chart ---
  if (type === 'pie') {
    const total = (data.totalCollected || 0) + (data.totalPending || 0);
    const collectedPercent = total > 0 ? (data.totalCollected / total) * 100 : 0;
    
    // Donut Math
    const radius = 15.9155; 
    const circumference = 100; 
    
    return (
      <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-8 animate-in fade-in">
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 shrink-0">
          <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#fed7aa" strokeWidth="6" />
            
            {/* Foreground Circle */}
            <circle 
              cx="21" cy="21" r={radius} 
              fill="transparent" 
              stroke="#22c55e" 
              strokeWidth="6"
              strokeDasharray={`${collectedPercent} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-gray-800">{Math.round(collectedPercent)}%</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Collected</span>
          </div>
        </div>
        
        <div className="flex flex-row sm:flex-col gap-4 w-full sm:w-auto justify-center">
          <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-700 font-medium uppercase">Collected</span>
             </div>
             <div className="text-lg font-bold text-gray-900 pl-4.5">₹{(data.totalCollected || 0).toLocaleString()}</div>
          </div>

          <div className="bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full"></div>
                <span className="text-xs text-orange-700 font-medium uppercase">Pending</span>
             </div>
             <div className="text-lg font-bold text-gray-900 pl-4.5">₹{(data.totalPending || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
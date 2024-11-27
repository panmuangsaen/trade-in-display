import React, { useEffect, useState } from 'react';
import { Card, Typography, Row, Col, Space, Pagination, Spin, DatePicker, Form, Button } from 'antd';
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import moment from 'moment';
import axios from 'axios';
import './App.css';

const { Text } = Typography;
const { RangePicker } = DatePicker;

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const axiosInstance = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: {
    Authorization: '',
  },
});

const App = () => {
  const [tradeData, setTradeData] = useState([]);
  const [rewardData, setRewardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [firstFlag, setFirstFlag] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [dataFetched, setDataFetched] = useState(false);

  const onFinish = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end date');
      return;
    }

    setLoading(true);

    // Fetch data with the selected start and end date
    axiosInstance.get('/trade-in/queryList', {
      params: {
        company_id: 233,
        start_date: startDate,
        end_date: endDate,
      },
    })
      .then((response) => {
        const data = response.data;
        const firstHundredRows = data.data.trade.slice(0, 100);
        setTradeData(firstHundredRows);

        let reward = {};
        data.data.reward.forEach((r) => {
          if (!reward[r.tel]) {
            reward[r.tel] = 0;
          }
          reward[r.tel] += r.point;
        });

        setRewardData(reward);
        setDataFetched(true);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        alert('Error fetching data');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (dataFetched && tradeData.length > 0 && firstFlag) {
      setFirstFlag(false);
      setSelectedPhone(processedData[0].phone);
    }
  }, [dataFetched, tradeData, firstFlag]);

  const processTradeData = (tradeData) => {
    const phoneGroups = tradeData.reduce((acc, item) => {
      const phone = item.staff_phone_number;
      if (!acc[phone]) {
        acc[phone] = [];
      }
      acc[phone].push(item);
      return acc;
    }, {});

    const allMonths = Array.from(new Set(tradeData.map(item => item.created_at.substring(0, 7))));
    allMonths.sort();

    const processedData = Object.keys(phoneGroups).map(phone => {
      const data = phoneGroups[phone];
      const countsByMonth = allMonths.reduce((acc, month) => {
        acc[month] = { open: 0, completed: 0, failed: 0 };
        return acc;
      }, {});

      data.forEach(item => {
        const month = item.created_at.substring(0, 7);
        if (item.status === "open") countsByMonth[month].open++;
        if (item.status === "completed") countsByMonth[month].completed++;
        if (item.status === "failed") countsByMonth[month].failed++;
      });

      const countsOpen = allMonths.map(month => countsByMonth[month].open);
      const countsCompleted = allMonths.map(month => countsByMonth[month].completed);
      const countsFailed = allMonths.map(month => countsByMonth[month].failed);

      return {
        phone,
        countsOpen,
        countsCompleted,
        countsFailed,
      };
    });

    return { allMonths, processedData };
  };

  const { allMonths, processedData } = processTradeData(tradeData);
  
    useEffect(() => {
      if (processedData.length > 0 && firstFlag) {
        setFirstFlag(false);
        setSelectedPhone(processedData[0].phone);
      }
    }, [processedData]);
    
    const filteredProcessedData = selectedPhone
    ? processedData.filter((item) => item.phone === selectedPhone)
    : processedData;
    
    const chartData = {
      labels: allMonths,
      datasets: filteredProcessedData.map((item) => ([
        {
          label: `Open`,
          data: item.countsOpen,
          backgroundColor: `rgba(75, 192, 192, 0.6)`,
          borderColor: `rgba(75, 192, 192, 1)`,
          borderWidth: 1,
        },
        {
          label: `Completed`,
          data: item.countsCompleted,
          backgroundColor: `rgba(153, 102, 255, 0.6)`,
          borderColor: `rgba(153, 102, 255, 1)`,
          borderWidth: 1,
        },
        {
          label: `Failed`,
          data: item.countsFailed,
          backgroundColor: `rgba(255, 99, 132, 0.6)`,
          borderColor: `rgba(255, 99, 132, 1)`,
          borderWidth: 1,
        }
      ]))
    };
  
    const flattenedChartData = {
      labels: chartData.labels,
      datasets: chartData.datasets.flat()
    };
  
    const options = {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: "Month",
          },
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          title: {
            display: true,
            text: "Frequency",
          },
          beginAtZero: true,
        },
      },
    };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  const currentData = tradeData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  const phoneNumbers = processedData.map(item => item.phone).filter((value, index, self) => self.indexOf(value) === index);
  


  // Define the reward chart function
  const getCoinsPerRecord = (recordCount) => {
    if (recordCount === 1) return 50;
    if (recordCount >= 2 && recordCount <= 4) return 75;
    if (recordCount >= 5 && recordCount <= 14) return 100;
    if (recordCount >= 15) return 125;
    return 0;
  };

  // Function to calculate total coins and points based on status
  const calculateTotalCoinsAndPoints = (phone) => {
    const phoneData = tradeData.filter(item => item.staff_phone_number === phone);

    const totalPoints = {
      points: 0, // Sum of coins from open and failed statuses
      validPoints: 0, // Sum of coins from completed status
    };

    const recordsByMonthAndStatus = phoneData.reduce((acc, record) => {
      const month = record.created_at.substring(0, 7);
      const status = record.status;

      if (!acc[month]) acc[month] = { open: 0, completed: 0, failed: 0 };
      acc[month][status] += 1;
      return acc;
    }, {});

    Object.keys(recordsByMonthAndStatus).forEach(month => {
        const totalCoin = recordsByMonthAndStatus[month]['completed'] + recordsByMonthAndStatus[month]['failed'] + recordsByMonthAndStatus[month]['open']
        const completeTotalCoin = recordsByMonthAndStatus[month]['completed']
  
        const coinsPerRecord = getCoinsPerRecord(totalCoin);
        const coinsPerRecordComplete = getCoinsPerRecord(completeTotalCoin);
        totalPoints.points += coinsPerRecord * totalCoin
        totalPoints.validPoints += coinsPerRecordComplete * completeTotalCoin
    });

    return {
      points: totalPoints.points,
      validPoints: totalPoints.validPoints,
      rewardPoints: rewardData[phone]? rewardData[phone]: 0
    };
  };

  const { points, validPoints, rewardPoints } = selectedPhone
    ? calculateTotalCoinsAndPoints(selectedPhone)
    : { totalCoins: {}, points: 0, validPoints: 0 };

  return (
    <div style={{ margin: '10px', position: 'relative' }}>
      <h1 style={{textAlign:'center'}}>PO Frequency Histogram (By Month and Status)</h1>

      {/* Form for date input */}
      <Form onFinish={onFinish} layout="vertical">
        <Row gutter={8} justify="center" align={'middle'}>
          <Col span={6}>
            <Form.Item
              label="Start Date"
              name="startDate"
              rules={[{ required: true, message: 'Please select a start date!' }]}
            >
              <DatePicker
                format="YYYY-MM-DD"
                placeholder="Select Start Date"
                onChange={(date, dateString) => setStartDate(dateString)} // onChange for start date
              />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item
              label="End Date"
              name="endDate"
              rules={[{ required: true, message: 'Please select an end date!' }]}
            >
              <DatePicker
                format="YYYY-MM-DD"
                placeholder="Select End Date"
                onChange={(date, dateString) => setEndDate(dateString)} // onChange for end date
              />
            </Form.Item>
          </Col>
        <Col span={6}>
        <Form.Item style={{ display: 'flex', justifyContent: 'center' }}>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Form.Item>
        </Col>
        </Row>
      </Form>

      {/* Loading spinner */}
      {loading && (
        <div className="loading-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          zIndex: 1000,
        }}>
          <Spin size="large" />
        </div>
      )}

      {/* Display Data */}
      {dataFetched && (
        <div className="App">
          <Row gutter={16} className="mg-t-20" justify={'center'}>
            <Col span={3}>
              <div style={{ height: '30vh', overflowY: 'scroll', padding: '10px', borderRight: '2px solid #ccc' }}>
                <h3>Phone Numbers</h3>
                <ul>
                  {phoneNumbers.map((phone, index) => (
                    <li
                      key={index}
                      onClick={() => setSelectedPhone(phone)}
                      style={{
                        cursor: 'pointer',
                        fontWeight: selectedPhone === phone ? 'bold' : 'normal',
                        color: selectedPhone === phone ? 'blue' : 'black',
                        marginBottom: '10px',
                      }}
                    >
                      {phone}
                    </li>
                  ))}
                </ul>
              </div>
            </Col>
            {/* Display selected phone details */}
            <Col span={3} >
              {selectedPhone ? (
                <div style={{ height: '30vh', overflowY: 'scroll', padding: '10px', borderRight: '2px solid #ccc' }}>
                  <h3>Total Points</h3>
                  <Text strong>Points:</Text> <Text>{points}</Text>
                  <br />
                  <Text strong>Valid Points:</Text> <Text>{validPoints}</Text>
                  <br />
                  <br />
                  <h3>Reward Points used</h3>
                  <Text strong>Points:</Text> <Text>{rewardPoints}</Text>
                  <br />
                  <br />
                  <h3>Net Coins Remaining</h3>
                  <Text strong>Points:</Text> <Text>{validPoints - rewardPoints}</Text>
                </div>
              ) : (
                <Text>Select a phone number to see coins</Text>
              )}
            </Col>

            {/* Chart */}
            <Col span={15}>
              <div style={{ height: '30vh', marginBottom: '20px' }}>
                <Bar data={flattenedChartData} options={options} />
              </div>
            </Col>
            <Col span={12}>
            <Row gutter={24} justify="center" style={{marginBottom:30, marginTop:30}}>
      {/* Count = 1: Coupon = 50 */}
      <Col span={6}>
        <Card bordered>
          <Text strong>Count = 1</Text><br />
          <Text>Coupon = 50</Text>
        </Card>
      </Col>

      {/* Count = 2-4: Coupon = 75 */}
      <Col span={6}>
        <Card bordered>
          <Text strong>Count = 2-4</Text><br />
          <Text>Coupon = 75</Text>
        </Card>
      </Col>

      {/* Count = 5-14: Coupon = 100 */}
      <Col span={6}>
        <Card bordered>
          <Text strong>Count = 5-14</Text><br />
          <Text>Coupon = 100</Text>
        </Card>
      </Col>

      {/* Count = 15: Coupon = 125 */}
      <Col span={6}>
        <Card bordered>
          <Text strong>Count = 15</Text><br />
          <Text>Coupon = 125</Text>
        </Card>
      </Col>
    </Row></Col>
          </Row>

          <div className="trade-in-container" style={{
            marginInline: '50px',
            height: '25vh',
            overflowY: 'auto',
          }}>
            <Space direction="vertical" size="large">
              {currentData.map((item, index) => (
                <Card key={index} bordered style={{ paddingInline: '40px' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>PO:</Text> <Text>{item.po}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Telephone:</Text> <Text>{item.staff_phone_number}</Text>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Status:</Text> <Text>{item.status}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Created at:</Text> <Text>{item.created_at}</Text>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Company:</Text> <Text>{item.company.name}</Text>
                    </Col>
                    <Col span={12}>
                      <Text strong>Updated at:</Text> <Text>{item.updated_at}</Text>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
            <Text>{process.env.REACT_APP_AUTHORIZATION_TOKEN}</Text>
          </div>

          {/* Pagination */}
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={tradeData.length}
            onChange={handlePageChange}
            showSizeChanger={false}
            style={{ textAlign: 'center', marginTop: '20px' }}
          />
        </div>
      )}
    </div>
  );
};

export default App;
